package pe.ebyzom.lumen.ui.screens

import android.Manifest
import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.*
import androidx.camera.view.PreviewView
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import pe.ebyzom.lumen.ui.theme.*
import pe.ebyzom.lumen.viewmodel.ScriptViewModel
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun TeleprompterScreen(
    viewModel: ScriptViewModel,
    scriptId: Long,
    onNavigateBack: () -> Unit
) {
    BackHandler { onNavigateBack() }

    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val density = LocalDensity.current.density
    val script by viewModel.currentScript.collectAsState()
    val settings by viewModel.settings.collectAsState()

    val scrollState = rememberScrollState()
    var isPlaying by remember { mutableStateOf(false) }

    // Font Size & Visual Settings
    var fontSize by remember(settings.fontSize) { mutableIntStateOf(settings.fontSize) }
    var isMirrorX by remember { mutableStateOf(settings.mirrorX) }
    var showCamera by remember { mutableStateOf(settings.cameraOverlay) }
    var isVoiceActive by remember { mutableStateOf(false) }
    var countdownValue by remember { mutableIntStateOf(0) }
    var countdownForRecording by remember { mutableStateOf(false) }

    // Video Recording to Device Storage
    var isRecording by remember { mutableStateOf(false) }
    var recordingSeconds by remember { mutableIntStateOf(0) }
    var savedVideoUri by remember { mutableStateOf<Uri?>(null) }
    var showTakeModal by remember { mutableStateOf(false) }
    var activeRecording by remember { mutableStateOf<Recording?>(null) }
    var videoCaptureInstance by remember { mutableStateOf<VideoCapture<Recorder>?>(null) }

    val scope = rememberCoroutineScope()

    val permissionState = rememberMultiplePermissionsState(
        permissions = listOf(
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO
        )
    )

    // Pulse animation for recording indicators
    val infiniteTransition = rememberInfiniteTransition(label = "rec_pulse")
    val recPulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.35f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse_alpha"
    )

    LaunchedEffect(scriptId) {
        permissionState.launchMultiplePermissionRequest()
        viewModel.loadScript(scriptId)
    }

    // Recording duration timer
    LaunchedEffect(isRecording) {
        if (isRecording) {
            recordingSeconds = 0
            while (isRecording) {
                delay(1000)
                recordingSeconds++
            }
        }
    }

    val currentWpm by rememberUpdatedState(settings.wpm)
    val currentFontSize by rememberUpdatedState(fontSize)
    val currentLineHeight by rememberUpdatedState(settings.lineHeight)

    // High-Precision Realtime Frame-Driven Auto-Scroll Engine (Continuous & Responsive)
    LaunchedEffect(isPlaying) {
        if (isPlaying) {
            var subpixelAccumulator = 0f
            var lastTimeNanos = withFrameNanos { it }
            while (isPlaying) {
                withFrameNanos { currentNanos ->
                    val elapsedNanos = currentNanos - lastTimeNanos
                    lastTimeNanos = currentNanos
                    val deltaSeconds = (elapsedNanos.coerceAtLeast(0L).coerceAtMost(100_000_000L)) / 1_000_000_000f

                    // Speech rate calibration:
                    // At currentWpm words per minute -> (currentWpm / 60f) words per second.
                    // Standard average: ~4.2 words per line on screen:
                    val linesPerSec = currentWpm.toFloat() / (60f * 4.2f)
                    val linePx = currentFontSize * currentLineHeight * density
                    val pxPerSec = (linesPerSec * linePx).coerceAtLeast(8f)

                    subpixelAccumulator += pxPerSec * deltaSeconds

                    if (subpixelAccumulator >= 1f) {
                        val pxToMove = subpixelAccumulator.toInt()
                        subpixelAccumulator -= pxToMove

                        if (scrollState.value < scrollState.maxValue) {
                            val consumed = scrollState.dispatchRawDelta(pxToMove.toFloat())
                            if (consumed == 0f && scrollState.value >= scrollState.maxValue) {
                                isPlaying = false
                            }
                        } else {
                            isPlaying = false
                        }
                    }
                }
            }
        }
    }

    // Speech Recognizer (Voice Tracking)
    DisposableEffect(isVoiceActive) {
        var speechRecognizer: SpeechRecognizer? = null
        if (isVoiceActive && SpeechRecognizer.isRecognitionAvailable(context)) {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                }

                setRecognitionListener(object : RecognitionListener {
                    override fun onReadyForSpeech(params: Bundle?) {}
                    override fun onBeginningOfSpeech() {}
                    override fun onRmsChanged(rmsdB: Float) {}
                    override fun onBufferReceived(buffer: ByteArray?) {}
                    override fun onEndOfSpeech() {}
                    override fun onError(error: Int) {
                        if (isVoiceActive) {
                            try { startListening(intent) } catch (e: Exception) {}
                        }
                    }
                    override fun onResults(results: Bundle?) {
                        scope.launch {
                            scrollState.dispatchRawDelta((fontSize * density * 2.2f))
                        }
                        if (isVoiceActive) {
                            try { startListening(intent) } catch (e: Exception) {}
                        }
                    }
                    override fun onPartialResults(partialResults: Bundle?) {
                        scope.launch {
                            scrollState.dispatchRawDelta((fontSize * density * 0.9f))
                        }
                    }
                    override fun onEvent(eventType: Int, params: Bundle?) {}
                })

                try {
                    startListening(intent)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }

        onDispose {
            speechRecognizer?.destroy()
        }
    }

    fun startPlaybackWithCountdown() {
        if (isPlaying) {
            isPlaying = false
        } else {
            scope.launch {
                countdownForRecording = false
                countdownValue = 3
                while (countdownValue > 0) {
                    delay(700)
                    countdownValue--
                }
                isPlaying = true
            }
        }
    }

    // Actually starts the video recording output
    fun beginActualRecording() {
        val vc = videoCaptureInstance
        if (vc != null) {
            val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
            val fileName = "LUMEN_TAKE_$timeStamp.mp4"

            val contentValues = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                put(MediaStore.MediaColumns.MIME_TYPE, "video/mp4")
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    put(MediaStore.Video.Media.RELATIVE_PATH, "Movies/Lumen")
                }
            }

            val mediaStoreOutputOptions = MediaStoreOutputOptions.Builder(
                context.contentResolver,
                MediaStore.Video.Media.EXTERNAL_CONTENT_URI
            ).setContentValues(contentValues).build()

            val pending = vc.output.prepareRecording(context, mediaStoreOutputOptions)
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                pending.withAudioEnabled()
            }

            activeRecording = pending.start(ContextCompat.getMainExecutor(context)) { event ->
                when (event) {
                    is VideoRecordEvent.Start -> {
                        isRecording = true
                        isPlaying = true
                        Toast.makeText(context, "● Grabando video en vivo...", Toast.LENGTH_SHORT).show()
                    }
                    is VideoRecordEvent.Finalize -> {
                        isRecording = false
                        isPlaying = false
                        if (!event.hasError()) {
                            savedVideoUri = event.outputResults.outputUri
                            showTakeModal = true
                        } else {
                            Toast.makeText(context, "Grabación finalizada: ${event.cause?.message ?: "Guardado"}", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            }
        } else {
            Toast.makeText(context, "Preparando cámara...", Toast.LENGTH_SHORT).show()
        }
    }

    // Start Video Recording with 3-2-1 Countdown & Auto-Scroll
    fun startRecordingFlow() {
        if (isRecording) {
            activeRecording?.stop()
            activeRecording = null
            isRecording = false
            isPlaying = false
        } else {
            scope.launch {
                countdownForRecording = true
                countdownValue = 3
                while (countdownValue > 0) {
                    delay(700)
                    countdownValue--
                }
                beginActualRecording()
            }
        }
    }

    val selectedFontFamily = when (settings.fontFamily.lowercase()) {
        "sans" -> FontFamily.SansSerif
        "mono" -> FontFamily.Monospace
        else -> FontFamily.Serif
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .then(
                if (isRecording) {
                    Modifier.border(4.dp, Color.Red.copy(alpha = recPulseAlpha))
                } else {
                    Modifier
                }
            )
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ) {
                if (countdownValue == 0) {
                    isPlaying = !isPlaying
                }
            }
    ) {
        // Background Camera Feed
        if (showCamera && permissionState.allPermissionsGranted) {
            CameraPreviewWithRecorder(
                modifier = Modifier.fillMaxSize().alpha(0.35f),
                onVideoCaptureReady = { videoCaptureInstance = it }
            )
        }

        BoxWithConstraints(
            modifier = Modifier.fillMaxSize()
        ) {
            val totalHeight = maxHeight
            val metaLineY = totalHeight * 0.38f
            val topPadding = metaLineY + 12.dp

            // Script Canvas (Supports Horizontal Mirror for beam splitter glass)
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer {
                        scaleX = if (isMirrorX) -1f else 1f
                        scaleY = if (settings.mirrorY) -1f else 1f
                    }
            ) {
                val safePaddingH = (settings.safeMargin * 2.2).dp

                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(scrollState)
                        .padding(horizontal = safePaddingH)
                        .padding(top = topPadding, bottom = totalHeight * 0.55f)
                ) {
                    Text(
                        text = script?.content ?: "...",
                        color = Color.White,
                        fontSize = fontSize.sp,
                        lineHeight = (fontSize * settings.lineHeight).sp,
                        textAlign = TextAlign.Center,
                        fontFamily = selectedFontFamily,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(metaLineY)
                        .align(Alignment.TopCenter)
                        .background(
                            Brush.verticalGradient(
                                listOf(
                                    Color.Black.copy(alpha = 0.88f),
                                    Color.Black.copy(alpha = 0.45f)
                                )
                            )
                        )
                )
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(220.dp)
                        .align(Alignment.BottomCenter)
                        .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.92f))))
                )
            }

            // Línea de meta: el texto a leer empieza debajo, no encima
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .offset(y = metaLineY)
                    .height(3.dp)
                    .padding(horizontal = 20.dp)
                    .background(LumenAccent, RoundedCornerShape(2.dp))
            )

            Row(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .offset(y = metaLineY - 12.dp)
                    .padding(start = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .background(LumenAccent, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.KeyboardArrowRight,
                        "Línea de meta",
                        tint = Color.Black,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }

        // Voice Tracking Active Badge
        if (isVoiceActive) {
            Surface(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 70.dp),
                color = LumenAccent.copy(alpha = 0.95f),
                shape = RoundedCornerShape(20.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Mic, "", tint = Color.Black, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(
                        "SEGUIMIENTO DE VOZ ACTIVO",
                        color = Color.Black,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                }
            }
        }

        // Countdown Overlay
        AnimatedVisibility(
            visible = countdownValue > 0,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier.align(Alignment.Center)
        ) {
            Box(
                modifier = Modifier
                    .size(130.dp)
                    .background(Color.Black.copy(alpha = 0.9f), CircleShape)
                    .border(3.dp, if (countdownForRecording) Color.Red else LumenAccent, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "$countdownValue",
                        fontSize = 52.sp,
                        fontWeight = FontWeight.Black,
                        fontFamily = FontFamily.Monospace,
                        color = if (countdownForRecording) Color.Red else LumenAccent
                    )
                    Text(
                        text = if (countdownForRecording) "GRABANDO EN..." else "INICIANDO...",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        letterSpacing = 1.sp
                    )
                }
            }
        }

        // TOP STATUS BAR (UNMISTAKABLE RECORDING STATUS INDICATOR)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(top = 8.dp, start = 12.dp, end = 12.dp)
                .align(Alignment.TopCenter),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Prominent Recording or Rehearsal Badge
            if (isRecording) {
                // ACTIVE RECORDING BANNER
                Surface(
                    color = Color.Red.copy(alpha = recPulseAlpha),
                    shape = RoundedCornerShape(20.dp),
                    border = BorderStroke(1.5.dp, Color.White),
                    modifier = Modifier.clickable { startRecordingFlow() }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .background(Color.White, CircleShape)
                        )
                        Spacer(Modifier.width(8.dp))
                        val mins = recordingSeconds / 60
                        val secs = recordingSeconds % 60
                        Text(
                            text = String.format("GRABANDO %02d:%02d • %d WPM", mins, secs, settings.wpm),
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Black,
                            fontFamily = FontFamily.Monospace,
                            letterSpacing = 1.sp
                        )
                    }
                }
            } else {
                // NOT RECORDING (REHEARSAL MODE) BANNER
                Surface(
                    color = Color.Black.copy(alpha = 0.75f),
                    shape = RoundedCornerShape(20.dp),
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.2f))
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(Color.Gray, CircleShape)
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            text = "MODO ENSAYO • ${settings.wpm} WPM",
                            color = Color.LightGray,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )
                    }
                }
            }

            // Quick Tool Buttons - Clean, frosted studio glass aesthetic (no garish colored dots)
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Camera Toggle (Clean frosted glass, white icon)
                IconButton(
                    onClick = { showCamera = !showCamera },
                    modifier = Modifier
                        .size(38.dp)
                        .background(Color.Black.copy(alpha = 0.65f), CircleShape)
                        .border(
                            1.dp,
                            if (showCamera) Color.White.copy(alpha = 0.5f) else Color.White.copy(alpha = 0.15f),
                            CircleShape
                        )
                ) {
                    Icon(
                        if (showCamera) Icons.Default.Videocam else Icons.Default.VideocamOff,
                        "Cámara",
                        tint = if (showCamera) Color.White else Color.Gray,
                        modifier = Modifier.size(18.dp)
                    )
                }

                // Font Size -
                IconButton(
                    onClick = {
                        if (fontSize > 20) {
                            val newSize = fontSize - 4
                            fontSize = newSize
                            viewModel.updateSettings(settings.copy(fontSize = newSize))
                        }
                    },
                    modifier = Modifier
                        .size(38.dp)
                        .background(Color.Black.copy(alpha = 0.65f), CircleShape)
                        .border(1.dp, Color.White.copy(alpha = 0.15f), CircleShape)
                ) {
                    Text("A-", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                }

                // Font Size +
                IconButton(
                    onClick = {
                        if (fontSize < 96) {
                            val newSize = fontSize + 4
                            fontSize = newSize
                            viewModel.updateSettings(settings.copy(fontSize = newSize))
                        }
                    },
                    modifier = Modifier
                        .size(38.dp)
                        .background(Color.Black.copy(alpha = 0.65f), CircleShape)
                        .border(1.dp, Color.White.copy(alpha = 0.15f), CircleShape)
                ) {
                    Text("A+", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                }

                // Exit / Close - Clean studio dark glass with crisp white icon (not red)
                IconButton(
                    onClick = onNavigateBack,
                    modifier = Modifier
                        .size(38.dp)
                        .background(Color.Black.copy(alpha = 0.65f), CircleShape)
                        .border(1.dp, Color.White.copy(alpha = 0.35f), CircleShape)
                ) {
                    Icon(Icons.Default.Edit, "Editor de guiones", tint = Color.White, modifier = Modifier.size(18.dp))
                }
            }
        }

        // PRIMARY FLOATING CONTROL PANEL (CLEAR RECORD VS READ BUTTONS)
        Surface(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(bottom = 12.dp, start = 12.dp, end = 12.dp)
                .widthIn(max = 580.dp),
            color = Color(0xFF18181B).copy(alpha = 0.98f),
            shape = RoundedCornerShape(32.dp),
            border = BorderStroke(
                width = if (isRecording) 2.dp else 1.dp,
                color = if (isRecording) Color.Red.copy(alpha = recPulseAlpha) else Color.White.copy(alpha = 0.2f)
            )
        ) {
            // Main Actions (GRABAR TOMA vs SOLO LEER)
            Row(
                modifier = Modifier
                    .padding(horizontal = 14.dp, vertical = 10.dp)
                    .fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Restart Script Button
                IconButton(
                    onClick = {
                        scope.launch { scrollState.scrollTo(0) }
                        isPlaying = false
                    },
                    modifier = Modifier
                        .size(42.dp)
                        .background(Color.White.copy(alpha = 0.1f), CircleShape)
                ) {
                    Icon(Icons.Default.Refresh, "Reiniciar", tint = Color.White, modifier = Modifier.size(20.dp))
                }

                // BIG RECORD BUTTON (UNMISTAKABLE: RED / STOP)
                Button(
                    onClick = { startRecordingFlow() },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isRecording) Color.Red else Color(0xFFDC2626)
                    ),
                    shape = RoundedCornerShape(24.dp),
                    modifier = Modifier
                        .height(48.dp)
                        .then(
                            if (isRecording) Modifier.border(2.dp, Color.White, RoundedCornerShape(24.dp))
                            else Modifier
                        ),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 0.dp)
                ) {
                    Icon(
                        if (isRecording) Icons.Default.Stop else Icons.Default.FiberManualRecord,
                        "",
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(
                        text = if (isRecording) "DETENER REC" else "GRABAR TOMA",
                        fontWeight = FontWeight.Black,
                        fontSize = 12.sp,
                        letterSpacing = 1.sp
                    )
                }

                // BIG PLAY / PAUSE BUTTON (SOLO LEER)
                Button(
                    onClick = { startPlaybackWithCountdown() },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isPlaying && !isRecording) Color.White else LumenAccent
                    ),
                    shape = RoundedCornerShape(24.dp),
                    modifier = Modifier.height(48.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 0.dp)
                ) {
                    Icon(
                        if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                        "",
                        tint = Color.Black,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(
                        text = if (isPlaying) "PAUSAR" else "LEER",
                        color = Color.Black,
                        fontWeight = FontWeight.Black,
                        fontSize = 12.sp,
                        letterSpacing = 1.sp
                    )
                }

                // Forward 10s Button
                IconButton(
                    onClick = {
                        scope.launch {
                            scrollState.scrollTo((scrollState.value + 400).coerceAtMost(scrollState.maxValue))
                        }
                    },
                    modifier = Modifier
                        .size(42.dp)
                        .background(Color.White.copy(alpha = 0.1f), CircleShape)
                ) {
                    Icon(Icons.Default.FastForward, "Avanzar", tint = Color.White, modifier = Modifier.size(20.dp))
                }
            }
        }

        // Take Saved Directly to Device Dialog
        if (showTakeModal && savedVideoUri != null) {
            AlertDialog(
                onDismissRequest = { showTakeModal = false },
                icon = {
                    Icon(Icons.Default.CheckCircle, "", tint = LumenAccent, modifier = Modifier.size(40.dp))
                },
                title = { Text("¡Video Guardado en tu Dispositivo!", fontWeight = FontWeight.Bold) },
                text = {
                    Column {
                        Text("Tu toma ha sido grabada y guardada con éxito en tu almacenamiento interno:")
                        Spacer(Modifier.height(8.dp))
                        Surface(
                            color = Color(0xFFF3F4F6),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(
                                    "📁 Ubicación: Películas / Lumen",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = LumenInk
                                )
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    "Ya está visible en tu Galería de Fotos y Videos.",
                                    fontSize = 11.sp,
                                    color = LumenGray
                                )
                            }
                        }
                    }
                },
                confirmButton = {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        TextButton(
                            onClick = {
                                savedVideoUri?.let { uri ->
                                    val viewIntent = Intent(Intent.ACTION_VIEW).apply {
                                        setDataAndType(uri, "video/mp4")
                                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                    }
                                    try {
                                        context.startActivity(viewIntent)
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "No se encontró reproductor de video", Toast.LENGTH_SHORT).show()
                                    }
                                }
                                showTakeModal = false
                            }
                        ) {
                            Text("REPRODUCIR", fontWeight = FontWeight.Bold)
                        }

                        Button(
                            onClick = {
                                savedVideoUri?.let { uri ->
                                    val sendIntent = Intent(Intent.ACTION_SEND).apply {
                                        type = "video/mp4"
                                        putExtra(Intent.EXTRA_STREAM, uri)
                                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                    }
                                    context.startActivity(Intent.createChooser(sendIntent, "Compartir Video"))
                                }
                                showTakeModal = false
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = LumenCta, contentColor = LumenOnCta)
                        ) {
                            Icon(Icons.Default.Share, "", modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("COMPARTIR", fontWeight = FontWeight.Bold)
                        }
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showTakeModal = false }) {
                        Text("CERRAR")
                    }
                }
            )
        }
    }
}

@Composable
fun CameraPreviewWithRecorder(
    modifier: Modifier = Modifier,
    onVideoCaptureReady: (VideoCapture<Recorder>) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val previewView = remember { PreviewView(context) }

    DisposableEffect(lifecycleOwner) {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        val executor = ContextCompat.getMainExecutor(context)
        var cameraProvider: ProcessCameraProvider? = null

        cameraProviderFuture.addListener({
            try {
                cameraProvider = cameraProviderFuture.get()
                previewView.scaleType = PreviewView.ScaleType.FILL_CENTER

                val preview = Preview.Builder().build().also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }

                // Vista previa se ve nítida; el archivo se guardaba en 720p (Quality.HD).
                // Pedimos la máxima calidad disponible (4K → 1080p → 720p → SD).
                val qualitySelector = QualitySelector.fromOrderedList(
                    listOf(Quality.UHD, Quality.FHD, Quality.HD, Quality.SD),
                    FallbackStrategy.lowerQualityOrHigherThan(Quality.FHD)
                )
                val recorder = Recorder.Builder()
                    .setQualitySelector(qualitySelector)
                    .build()
                val videoCapture = VideoCapture.withOutput(recorder)
                onVideoCaptureReady(videoCapture)

                cameraProvider?.unbindAll()

                val cameraSelector = if (cameraProvider?.hasCamera(CameraSelector.DEFAULT_FRONT_CAMERA) == true) {
                    CameraSelector.DEFAULT_FRONT_CAMERA
                } else if (cameraProvider?.hasCamera(CameraSelector.DEFAULT_BACK_CAMERA) == true) {
                    CameraSelector.DEFAULT_BACK_CAMERA
                } else {
                    null
                }

                if (cameraSelector != null) {
                    try {
                        cameraProvider?.bindToLifecycle(lifecycleOwner, cameraSelector, preview, videoCapture)
                    } catch (e: Exception) {
                        cameraProvider?.bindToLifecycle(lifecycleOwner, cameraSelector, preview)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }, executor)

        onDispose {
            try {
                cameraProvider?.unbindAll()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    AndroidView(
        factory = { previewView },
        modifier = modifier
    )
}
