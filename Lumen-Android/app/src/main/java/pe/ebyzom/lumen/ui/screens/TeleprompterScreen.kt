package pe.ebyzom.lumen.ui.screens

import android.Manifest
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.view.PreviewView
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.BorderStroke
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import pe.ebyzom.lumen.ui.theme.*
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
    var wpm by remember { mutableIntStateOf(script?.wpm ?: 135) }
    var fontSize by remember { mutableIntStateOf(script?.fontSize ?: 48) }
    
    val scope = rememberCoroutineScope()

    val permissionState = rememberMultiplePermissionsState(
        permissions = listOf(
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO
        )
    )

    LaunchedEffect(scriptId) {
        permissionState.launchMultiplePermissionRequest()
        viewModel.loadScript(scriptId)
    }

    // High-precision auto-scroll loop
    LaunchedEffect(isPlaying, wpm, fontSize) {
        if (isPlaying) {
            val wordsPerSec = wpm / 60.0
            val pixelsPerSec = (wordsPerSec / 7.0) * (fontSize * 1.5)
            
            var lastTime = System.currentTimeMillis()
            while (isPlaying) {
                val currentTime = System.currentTimeMillis()
                val deltaTime = (currentTime - lastTime) / 1000.0
                val pixelsToScroll = (pixelsPerSec * deltaTime).toInt()
                
                if (pixelsToScroll >= 1) {
                    scrollState.scrollTo(scrollState.value + pixelsToScroll)
                    lastTime = currentTime
                }
                delay(10)
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        
        // Background Camera (Fade exacto de la web)
        if (permissionState.allPermissionsGranted) {
            CameraPreview(modifier = Modifier.fillMaxSize().alpha(0.35f))
        }

        // Script Canvas
        Box(modifier = Modifier.fillMaxSize()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(scrollState)
                    .padding(horizontal = 40.dp, vertical = 420.dp)
            ) {
                Text(
                    text = script?.content ?: "...",
                    color = Color.White,
                    fontSize = fontSize.sp,
                    lineHeight = (fontSize * 1.4).sp,
                    textAlign = TextAlign.Center,
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.fillMaxWidth()
                )
            }
            
            // Vignette Fades
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .align(Alignment.TopCenter)
                    .background(Brush.verticalGradient(listOf(Color.Black, Color.Transparent)))
            )
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(250.dp)
                    .align(Alignment.BottomCenter)
                    .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black)))
            )
        }

        // Reader Focus Line (Cian exacto)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(4.dp)
                .align(Alignment.Center)
                .padding(horizontal = 16.dp)
                .background(LumenAccent.copy(alpha = 0.9f), CircleShape)
        )
        
        // "FOCUS" tag like web
        Row(
            modifier = Modifier
                .align(Alignment.CenterStart)
                .padding(start = 6.dp)
                .offset(y = (-24).dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier.size(24.dp).background(LumenAccent, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.KeyboardArrowRight, "", tint = Color.White, modifier = Modifier.size(16.dp))
            }
        }

        // FLOATING CONTROL PILL (Exact clone)
        Surface(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 32.dp)
                .padding(horizontal = 20.dp)
                .widthIn(max = 500.dp),
            color = Color(0xFF1E1E1E).copy(alpha = 0.98f),
            shape = RoundedCornerShape(40.dp),
            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.15f))
        ) {
            Row(
                modifier = Modifier.padding(10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Restart
                IconButton(
                    onClick = { scope.launch { scrollState.scrollTo(0) }; isPlaying = false },
                    modifier = Modifier.size(44.dp).background(Color.White.copy(alpha = 0.08f), CircleShape)
                ) {
                    Icon(Icons.Default.Refresh, "", tint = Color.White, modifier = Modifier.size(20.dp))
                }
                
                Spacer(Modifier.width(12.dp))

                // Play / Pause Circle
                IconButton(
                    onClick = { isPlaying = !isPlaying },
                    modifier = Modifier
                        .size(60.dp)
                        .background(if (isPlaying) Color.White else LumenAccent, CircleShape)
                ) {
                    Icon(
                        if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow, 
                        "",
                        tint = if (isPlaying) Color.Black else Color.White,
                        modifier = Modifier.size(30.dp)
                    )
                }

                Spacer(Modifier.width(12.dp))
                
                // WPM Controller
                Column(
                    modifier = Modifier.weight(1f).padding(horizontal = 4.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        "${wpm} WPM", 
                        color = Color.White, 
                        fontSize = 11.sp, 
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Black
                    )
                    Slider(
                        value = wpm.toFloat(),
                        onValueChange = { wpm = it.toInt() },
                        valueRange = 10f..600f,
                        colors = SliderDefaults.colors(
                            thumbColor = LumenAccent,
                            activeTrackColor = LumenAccent,
                            inactiveTrackColor = Color.White.copy(alpha = 0.15f)
                        ),
                        modifier = Modifier.height(24.dp)
                    )
                }
                
                Spacer(Modifier.width(8.dp))

                // Close
                IconButton(
                    onClick = onNavigateBack,
                    modifier = Modifier.size(44.dp).background(Color.Red.copy(alpha = 0.15f), CircleShape)
                ) {
                    Icon(Icons.Default.Close, "", tint = Color.Red, modifier = Modifier.size(20.dp))
                }
            }
        }
    }
}

@Composable
fun CameraPreview(modifier: Modifier = Modifier) {
    val context = LocalContext()
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
            } catch (e: Exception) { e.printStackTrace() }
        }, androidx.core.content.ContextCompat.getMainExecutor(context))
    }
}
