package pe.ebyzom.lumen.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = LumenBg,
    secondary = LumenGray,
    tertiary = LumenAccent,
    background = LumenInk,
    surface = Color(0xFF1E1E1E),
    onPrimary = LumenInk,
    onBackground = LumenBg,
    onSurface = LumenBg
)

private val LightColorScheme = lightColorScheme(
    primary = LumenInk,
    secondary = LumenGray,
    tertiary = LumenAccent,
    background = LumenBg,
    surface = Color.White,
    onPrimary = Color.White,
    onBackground = LumenInk,
    onSurface = LumenInk
)

@Composable
fun LumenTeleprompterTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
