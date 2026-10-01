package pe.ebyzom.lumen.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import pe.ebyzom.lumen.ui.theme.*

@Composable
fun LumenBottomNav(
    currentRoute: String?,
    onNavigate: (String) -> Unit,
    onLaunchReading: () -> Unit,
    onMenuClick: () -> Unit
) {
    Surface(
        color = LumenPaper,
        modifier = Modifier
            .fillMaxWidth()
            .drawBehind {
                drawLine(
                    color = LumenBorder,
                    start = Offset(0f, 0f),
                    end = Offset(size.width, 0f),
                    strokeWidth = 2f
                )
            }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 4.dp)
                .height(64.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            val isEditor = currentRoute?.contains("script") == true
            val isReading = currentRoute?.contains("teleprompter") == true

            NavTab(
                icon = Icons.Default.Edit,
                label = "EDITOR",
                isActive = isEditor,
                onClick = { onNavigate("script_list") }
            )

            NavTab(
                icon = Icons.Default.PlayArrow,
                label = "TELEPROMPTER",
                isActive = isReading,
                onClick = onLaunchReading
            )

            NavTab(
                icon = Icons.Default.Menu,
                label = "MENÚ",
                isActive = false,
                onClick = onMenuClick
            )
        }
    }
}

@Composable
private fun RowScope.NavTab(
    icon: ImageVector,
    label: String,
    isActive: Boolean,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .weight(1f)
            .clickable { onClick() }
            .padding(vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(if (isActive) LumenAccent else Color.Transparent),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = if (isActive) LumenOnCta else LumenGray,
                modifier = Modifier.size(20.dp)
            )
        }
        Spacer(Modifier.height(4.dp))
        Text(
            text = label,
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            color = if (isActive) LumenAccent else LumenGray,
            letterSpacing = 1.sp
        )
    }
}
