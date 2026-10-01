package pe.ebyzom.lumen.ui.components

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalInspectionMode
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.google.android.gms.ads.AdListener
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import pe.ebyzom.lumen.ui.theme.LumenBorder
import pe.ebyzom.lumen.ui.theme.LumenMuted
import pe.ebyzom.lumen.ui.theme.LumenPaper

private var isMobileAdsInitialized = false

@Composable
fun AdBanner(
    adUnitId: String = "ca-app-pub-7470413991742442/4821639268",
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val isInspection = LocalInspectionMode.current
    var isAdLoaded by remember { mutableStateOf(false) }
    var adFailed by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        if (!isMobileAdsInitialized && !isInspection) {
            try {
                MobileAds.initialize(context) {}
                isMobileAdsInitialized = true
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    if (isInspection) {
        Box(
            modifier = modifier
                .fillMaxWidth()
                .height(50.dp)
                .background(Color.LightGray),
            contentAlignment = Alignment.Center
        ) {
            Text("Espacio de Anuncio Banner AdMob", fontSize = 11.sp, color = Color.DarkGray)
        }
        return
    }

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .wrapContentHeight(),
        color = LumenPaper
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Subtle separation hairline
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(LumenBorder)
            )

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 50.dp),
                contentAlignment = Alignment.Center
            ) {
                AndroidView(
                    modifier = Modifier.fillMaxWidth(),
                    factory = { ctx ->
                        AdView(ctx).apply {
                            setAdSize(AdSize.BANNER)
                            setAdUnitId(adUnitId)
                            adListener = object : AdListener() {
                                override fun onAdLoaded() {
                                    isAdLoaded = true
                                    adFailed = false
                                }

                                override fun onAdFailedToLoad(error: LoadAdError) {
                                    adFailed = true
                                }
                            }
                            loadAd(AdRequest.Builder().build())
                        }
                    },
                    update = { adView ->
                        // Re-trigger load if necessary
                    }
                )

                // Placeholder / Sponsor label while loading or if offline
                if (!isAdLoaded && !adFailed) {
                    Text(
                        text = "PUBLICIDAD",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = LumenMuted,
                        letterSpacing = 1.sp
                    )
                }
            }
        }
    }
}
