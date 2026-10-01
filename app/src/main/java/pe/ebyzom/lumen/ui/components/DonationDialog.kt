package pe.ebyzom.lumen.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import pe.ebyzom.lumen.ui.theme.*

@Composable
fun DonationDialog(
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = LumenBg,
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            shadowElevation = 8.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    IconButton(onClick = onDismiss, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.Close, "", tint = LumenGray)
                    }
                }

                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .background(Color(0xFFFEE2E2), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.Favorite,
                        contentDescription = "Donar",
                        tint = Color(0xFFDC2626),
                        modifier = Modifier.size(32.dp)
                    )
                }

                Spacer(Modifier.height(16.dp))

                Text(
                    "Apoya a Lumen Teleprompter",
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.Bold,
                    fontStyle = FontStyle.Italic,
                    fontSize = 20.sp,
                    color = LumenInk,
                    textAlign = TextAlign.Center
                )

                Spacer(Modifier.height(8.dp))

                Text(
                    "Lumen es un software independiente desarrollado por EBYZOM E.I.R.L. para creadores, periodistas y oradores de todo el mundo.",
                    fontSize = 13.sp,
                    color = LumenGray,
                    textAlign = TextAlign.Center,
                    lineHeight = 18.sp
                )

                Spacer(Modifier.height(20.dp))

                Surface(
                    color = LumenPaper,
                    shape = RoundedCornerShape(8.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, LumenBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            "EBYZOM E.I.R.L.",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = LumenInk
                        )
                        Text(
                            "Lima, Perú • Desarrollo de Software",
                            fontSize = 11.sp,
                            color = LumenMuted
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Tu contribución nos ayuda a mantener el proyecto libre de anuncios molestos y con constantes mejoras en algoritmos de teleprompter.",
                            fontSize = 12.sp,
                            color = LumenGray,
                            textAlign = TextAlign.Center
                        )
                    }
                }

                Spacer(Modifier.height(24.dp))

                Button(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(Icons.Default.Favorite, "", modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("¡GRACIAS POR TU APOYO!", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
