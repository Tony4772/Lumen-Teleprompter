package pe.ebyzom.lumen

import android.app.Application
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader

class LumenApp : Application() {
    override fun onCreate() {
        super.onCreate()
        PDFBoxResourceLoader.init(applicationContext)
    }
}
