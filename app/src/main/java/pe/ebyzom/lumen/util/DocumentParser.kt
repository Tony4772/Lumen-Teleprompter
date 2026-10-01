package pe.ebyzom.lumen.util

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Xml
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.text.PDFTextStripper
import org.xmlpull.v1.XmlPullParser
import java.io.ByteArrayInputStream
import java.io.InputStream
import java.nio.charset.Charset
import java.util.zip.ZipInputStream

object DocumentParser {

    data class ParsedDocument(val title: String, val content: String)

    fun parse(context: Context, uri: Uri): ParsedDocument {
        val fileName = getFileName(context, uri)
        val cleanTitle = cleanFileName(fileName)
        val lowerName = fileName.lowercase()
        val mime = context.contentResolver.getType(uri)?.lowercase().orEmpty()

        val content = try {
            when {
                isPdf(lowerName, mime) -> parsePdf(context, uri)
                isDocx(lowerName, mime) -> parseDocx(context, uri)
                isDoc(lowerName, mime) -> parseDoc(context, uri)
                else -> parsePlainText(context, uri)
            }
        } catch (e: Exception) {
            e.printStackTrace()
            try {
                parsePlainText(context, uri)
            } catch (_: Exception) {
                "No se pudo extraer el texto del archivo. Prueba con .txt, .docx o un PDF que no sea una foto escaneada."
            }
        }

        return ParsedDocument(
            title = if (cleanTitle.isBlank()) "Guión Importado" else cleanTitle,
            content = sanitizeText(content)
        )
    }

    private fun isPdf(name: String, mime: String) =
        name.endsWith(".pdf") || mime.contains("pdf")

    private fun isDocx(name: String, mime: String) =
        name.endsWith(".docx") || mime.contains("wordprocessingml")

    private fun isDoc(name: String, mime: String) =
        name.endsWith(".doc") || mime == "application/msword"

    private fun getFileName(context: Context, uri: Uri): String {
        var name = "guion_importado.txt"
        try {
            context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (index != -1) {
                        val str = cursor.getString(index)
                        if (!str.isNullOrBlank()) {
                            name = str
                        }
                    }
                }
            }
        } catch (_: Exception) {
            val lastSegment = uri.lastPathSegment
            if (!lastSegment.isNullOrBlank()) {
                name = lastSegment
            }
        }
        return name
    }

    private fun cleanFileName(fileName: String): String {
        return fileName
            .replaceFirst(Regex("\\.[a-zA-Z0-9]+$"), "")
            .replace('_', ' ')
            .replace('-', ' ')
            .trim()
            .split(" ")
            .joinToString(" ") { word ->
                word.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
            }
    }

    private fun parsePlainText(context: Context, uri: Uri): String {
        val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return ""
        if (bytes.isEmpty()) return ""

        val utf8 = String(bytes, Charsets.UTF_8)
        val replacementRatio = if (utf8.isEmpty()) 1f else utf8.count { it == '\uFFFD' }.toFloat() / utf8.length
        if (replacementRatio < 0.08f) {
            return utf8
        }
        return String(bytes, Charset.forName("Windows-1252"))
    }

    private fun parseDocx(context: Context, uri: Uri): String {
        context.contentResolver.openInputStream(uri)?.use { stream ->
            return extractDocxFromStream(stream)
        }
        return ""
    }

    private fun parseDoc(context: Context, uri: Uri): String {
        val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return ""
        if (bytes.size >= 2 && bytes[0] == 0x50.toByte() && bytes[1] == 0x4B.toByte()) {
            return extractDocxFromStream(ByteArrayInputStream(bytes))
        }
        val extracted = extractUtf16Runs(bytes)
        return extracted.ifBlank {
            "No se pudo leer este .doc. Ábrelo en Word y guárdalo como .docx o .txt, luego cárgalo de nuevo."
        }
    }

    private fun extractDocxFromStream(stream: InputStream): String {
        val zip = ZipInputStream(stream)
        var entry = zip.nextEntry
        while (entry != null) {
            if (entry.name == "word/document.xml") {
                return extractTextFromDocxXml(zip)
            }
            zip.closeEntry()
            entry = zip.nextEntry
        }
        return ""
    }

    private fun extractTextFromDocxXml(inputStream: InputStream): String {
        val parser = Xml.newPullParser()
        parser.setFeature(XmlPullParser.FEATURE_PROCESS_NAMESPACES, false)
        parser.setInput(inputStream, "UTF-8")

        val sb = StringBuilder()
        var eventType = parser.eventType

        while (eventType != XmlPullParser.END_DOCUMENT) {
            val name = parser.name
            when (eventType) {
                XmlPullParser.START_TAG -> {
                    if (name.equals("p", ignoreCase = true) || name.endsWith(":p", ignoreCase = true)) {
                        if (sb.isNotEmpty() && !sb.endsWith("\n\n")) {
                            sb.append("\n\n")
                        }
                    } else if (name.equals("t", ignoreCase = true) || name.endsWith(":t", ignoreCase = true)) {
                        val text = parser.nextText()
                        sb.append(text)
                    }
                }
            }
            eventType = parser.next()
        }

        return sb.toString()
    }

    private fun parsePdf(context: Context, uri: Uri): String {
        PDFBoxResourceLoader.init(context.applicationContext)

        context.contentResolver.openInputStream(uri)?.use { stream ->
            PDDocument.load(stream).use { document ->
                val stripper = PDFTextStripper()
                stripper.sortByPosition = true
                val text = stripper.getText(document).orEmpty()
                val cleaned = sanitizeText(text)
                if (cleaned.length >= 8) {
                    return cleaned
                }
            }
        }

        return "Este PDF no tiene texto extraíble (suele pasar si es una foto o está escaneado). Exporta el documento a .txt o .docx e impórtalo de nuevo."
    }

    private fun extractUtf16Runs(bytes: ByteArray): String {
        val sb = StringBuilder()
        val current = StringBuilder()
        var i = 0
        while (i + 1 < bytes.size) {
            val code = (bytes[i].toInt() and 0xFF) or ((bytes[i + 1].toInt() and 0xFF) shl 8)
            val isText = code == 9 || code == 10 || code == 13 ||
                code in 32..126 || code in 160..591 || code in 0x1EA0..0x1EFF
            if (isText) {
                current.append(code.toChar())
                i += 2
            } else {
                if (current.length >= 4) {
                    if (sb.isNotEmpty()) sb.append(' ')
                    sb.append(current)
                }
                current.clear()
                i += 2
            }
        }
        if (current.length >= 4) {
            if (sb.isNotEmpty()) sb.append(' ')
            sb.append(current)
        }
        return sanitizeText(sb.toString())
    }

    private fun sanitizeText(input: String): String {
        return input
            .replace("\u0000", "")
            .replace("\r\n", "\n")
            .replace("\r", "\n")
            .replace(Regex("[\\t ]+"), " ")
            .replace(Regex("\n{3,}"), "\n\n")
            .trim()
    }
}
