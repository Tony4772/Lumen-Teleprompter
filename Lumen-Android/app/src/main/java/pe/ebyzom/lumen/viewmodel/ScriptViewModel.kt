package pe.ebyzom.lumen.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import pe.ebyzom.lumen.data.repository.ScriptRepository
import pe.ebyzom.lumen.model.AppSettings
import pe.ebyzom.lumen.model.Script
import java.net.HttpURLConnection
import java.net.URL

class ScriptViewModel(private val repository: ScriptRepository) : ViewModel() {

    val allScripts: StateFlow<List<Script>> = repository.allScripts
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _currentScript = MutableStateFlow<Script?>(null)
    val currentScript: StateFlow<Script?> = _currentScript

    private val _settings = MutableStateFlow(AppSettings())
    val settings: StateFlow<AppSettings> = _settings

    private val _aiResult = MutableStateFlow<String?>(null)
    val aiResult: StateFlow<String?> = _aiResult

    private val _isAiLoading = MutableStateFlow(false)
    val isAiLoading: StateFlow<Boolean> = _isAiLoading

    fun loadScript(id: Long) {
        viewModelScope.launch {
            _currentScript.value = repository.getScriptById(id)
        }
    }

    fun updateSettings(newSettings: AppSettings) {
        _settings.value = newSettings
    }

    fun saveScript(title: String, content: String, wpm: Int? = null, fontSize: Int? = null) {
        viewModelScope.launch {
            val script = _currentScript.value
            val finalWpm = wpm ?: _settings.value.wpm
            val finalSize = fontSize ?: _settings.value.fontSize
            
            if (script != null) {
                repository.updateScript(script.copy(
                    title = title,
                    content = content,
                    wpm = finalWpm,
                    fontSize = finalSize,
                    updatedAt = System.currentTimeMillis()
                ))
            } else {
                repository.insertScript(Script(
                    title = title,
                    content = content,
                    wpm = finalWpm,
                    fontSize = finalSize
                ))
            }
        }
    }

    fun deleteScript(script: Script) {
        viewModelScope.launch {
            repository.deleteScript(script)
        }
    }

    // --- IA ATELIER ENGINE ---
    fun generateAiScript(topic: String, format: String, tone: String, duration: Int) {
        executeAiRequest("/ai/generate-script", JSONObject().apply {
            put("topic", topic)
            put("format", format)
            put("tone", tone)
            put("targetDurationMinutes", duration)
            put("language", "Spanish")
        })
    }

    fun enhanceAiScript(content: String, action: String) {
        executeAiRequest("/ai/enhance-script", JSONObject().apply {
            put("script", content)
            put("action", action)
            put("language", "Spanish")
        })
    }

    private fun executeAiRequest(endpoint: String, payload: JSONObject) {
        viewModelScope.launch {
            _isAiLoading.value = true
            _aiResult.value = null
            try {
                val result = withContext(Dispatchers.IO) {
                    val url = URL("https://tu-app-lumen.vercel.app/api$endpoint")
                    val conn = url.openConnection() as HttpURLConnection
                    conn.requestMethod = "POST"
                    conn.setRequestProperty("Content-Type", "application/json")
                    conn.doOutput = true
                    
                    conn.outputStream.use { os ->
                        os.write(payload.toString().toByteArray())
                    }

                    if (conn.responseCode == 200) {
                        val response = conn.inputStream.bufferedReader().readText()
                        JSONObject(response).getString("script")
                    } else {
                        "Error del servidor: ${conn.responseCode}"
                    }
                }
                _aiResult.value = result
            } catch (e: Exception) {
                _aiResult.value = "Error de conexión: ${e.message}"
            } finally {
                _isAiLoading.value = false
            }
        }
    }
}
