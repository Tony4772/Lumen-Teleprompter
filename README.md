# Lumen Teleprompter Studio — Android

Lumen Teleprompter Studio is an editorial, high-contrast teleprompter studio designed for speakers, presenters, executives, and video creators.

## Key Features

- **High-Precision Auto-Scroll**: Smooth scrolling engine with real-time Words Per Minute (WPM) speed regulation (10 to 400 WPM).
- **Beam-Splitter Mirror Mode**: Hardware-compatible horizontal flip (Mirror X) and vertical invert (Mirror Y) for glass teleprompter rigs.
- **Camera Backdrop Overlay**: Front-facing camera preview with gentle vignette fades for maintaining eye contact with the camera lens.
- **Editorial Script Studio**: Local Room SQLite storage, word count, speaking time estimates, script sharing, and cloning.
- **Custom Adaptive Icon**: Designed specifically for Lumen with Material You support and dark broadcast styling.
- **Preloaded Editorial Scripts**: Includes real-world keynote, tech review, and pitch scripts.

## Tech Stack

- **Platform**: Android SDK 36 (minSdk 26, targetSdk 34)
- **UI Framework**: Jetpack Compose (Material 3)
- **Architecture**: MVVM with Kotlin Coroutines & StateFlow
- **Local Persistence**: Room 2.6.1 with KSP
- **Hardware Integration**: CameraX 1.3.1 (Camera2)
- **Build System**: Gradle 9.3.1 with Android Gradle Plugin 8.9.0 & Kotlin 2.1.10
