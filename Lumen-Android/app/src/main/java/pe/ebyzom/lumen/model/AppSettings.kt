package pe.ebyzom.lumen.model

data class AppSettings(
    val wpm: Int = 135,
    val fontSize: Int = 48,
    val lineHeight: Float = 1.4f,
    val safeMargin: Int = 15,
    val mirrorX: Boolean = false,
    val mirrorY: Boolean = false,
    val readerLineStyle: String = "bar",
    val readerLinePosition: Int = 50,
    val countdownSeconds: Int = 5,
    val cameraOverlay: Boolean = true,
    val cameraLayout: String = "background",
    val speechTracking: Boolean = false,
    val focusDim: Boolean = false,
    val fontFamily: String = "Serif"
)
