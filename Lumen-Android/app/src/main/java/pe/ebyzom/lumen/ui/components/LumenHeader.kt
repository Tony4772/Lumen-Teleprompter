package pe.ebyzom.lumen.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import pe.ebyzom.lumen.ui.theme.*

@Composable
fun LumenHeader(
    activeScriptTitle: String,
    onOpenSettings: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(LumenBg)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(64.dp)
                .padding(horizontal = 20.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // Logo Section
            Column {
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(
                        text = "Lumen.",
                        fontFamily = FontFamily.Serif,
                        fontWeight = FontWeight.Bold,
                        fontStyle = FontStyle.Italic,
                        fontSize = 26.sp,
                        color = LumenInk,
                        modifier = Modifier.padding(bottom = 0.dp)
                    )
                    Spacer(Modifier.width(6.dp))
                    Box(
                        modifier = Modifier
                            .height(18.dp)
                            .width(1.dp)
                            .background(LumenBorder)
                            .align(Alignment.CenterVertically)
                            .padding(vertical = 4.dp)
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(
                        text = "STUDIO",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 2.sp,
                        color = LumenGray,
                        modifier = Modifier.align(Alignment.CenterVertically).padding(top = 2.dp)
                    )
                }
                Text(
                    text = "© EBYZOM E.I.R.L.",
                    fontSize = 7.sp,
                    fontFamily = FontFamily.Monospace,
                    color = LumenMuted,
                    modifier = Modifier.padding(top = 0.dp)
                )
            }

            // Right Actions
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = activeScriptTitle,
                    fontSize = 12.sp,
                    fontFamily = FontFamily.Serif,
                    fontStyle = FontStyle.Italic,
                    color = LumenGray,
                    modifier = Modifier.padding(end = 12.dp)
                )
                IconButton(onClick = onOpenSettings, modifier = Modifier.size(36.dp)) {
                    Icon(Icons.Default.Settings, "", tint = LumenGray, modifier = Modifier.size(20.dp))
                }
            }
        }
        Divider(color = LumenBorder, thickness = 1.dp)
    }
}
