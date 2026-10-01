package pe.ebyzom.lumen.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val LumenColorScheme = darkColorScheme(
    primary = LumenAccent,
    secondary = LumenGray,
    tertiary = LumenAccent,
    background = LumenBg,
    surface = LumenPaper,
    surfaceVariant = LumenOverlay,
    onPrimary = LumenOnCta,
    onBackground = LumenInk,
    onSurface = LumenInk,
    onSurfaceVariant = LumenGray,
    outline = LumenBorder,
    error = LumenRed
)

@Composable
fun LumenTeleprompterTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = LumenColorScheme,
        typography = Typography,
        content = content
    )
}
