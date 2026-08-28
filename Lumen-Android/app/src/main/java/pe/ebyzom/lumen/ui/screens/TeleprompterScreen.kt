package pe.ebyzom.lumen.ui.screens

import android.Manifest
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import kotlinx.coroutines.delay
import pe.ebyzom.lumen.viewmodel.ScriptViewModel

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun TeleprompterScreen(
    viewModel: ScriptViewModel,
    scriptId: Long,
    onNavigateBack: () -> Unit
) {
    val script by viewModel.currentScript.collectAsState()
    val scrollState = rememberScrollState()
    var isPlaying by remember { mutableStateOf(false) }

    // Manejo de Permisos Nativo
    val permissionState = rememberMultiplePermissionsState(
        permissions = listOf(
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO
        )
    )

    LaunchedEffect(Unit) {
        permissionState.launchMultiplePermissionRequest()
        viewModel.loadScript(scriptId)
    }

    LaunchedEffect(isPlaying) {
        if (isPlaying && permissionState.allPermissionsGranted) {
            while (true) {
                scrollState.animateScrollTo(scrollState.value + 1)
                delay(30)
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        if (permissionState.allPermissionsGranted) {
            CameraPreview(modifier = Modifier.fillMaxSize().alpha(0.4f))
        } else {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    "Se requieren permisos de cámara para el modo lectura",
                    color = Color.Gray,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(32.dp)
                )
            }
        }

        // Texto del Teleprompter
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(horizontal = 24.dp, vertical = 400.dp)
        ) {
            Text(
                text = script?.content ?: "Cargando texto...",
                color = Color.White,
                fontSize = (script?.fontSize ?: 48).sp,
                lineHeight = ((script?.fontSize ?: 48) * 1.5).sp,
                textAlign = TextAlign.Center,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.fillMaxWidth()
            )
        }

        // Guía Visual
        Divider(
            modifier = Modifier.fillMaxWidth().align(Alignment.Center).height(2.dp),
            color = Color(0xFF00D1FF).copy(alpha = 0.6f)
        )

        // Controles Pro
        Surface(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 40.dp),
            color = Color.DarkGray.copy(alpha = 0.8f),
            shape = MaterialTheme.shapes.extraLarge
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(24.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { isPlaying = !isPlaying }) {
                    Text(if (isPlaying) "⏸" else "▶️", fontSize = 24.sp)
                }
                Button(onClick = onNavigateBack, colors = ButtonDefaults.buttonColors(containerColor = Color.Red.copy(alpha = 0.6f))) {
                    Text("SALIR")
                }
            }
        }
    }
}

@Composable
fun CameraPreview(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val previewView = remember { PreviewView(context) }

    AndroidView(
        factory = { previewView },
        modifier = modifier
    ) {
        val cameraProviderFuture = androidx.camera.lifecycle.ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(previewView.surfaceProvider)
            }
            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_FRONT_CAMERA, preview)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }, androidx.core.content.ContextCompat.getMainExecutor(context))
    }
}
