name: Build APK
on:
  push:
  workflow_dispatch:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Unzip project
        run: unzip -q transport_android_project.zip
      - name: Fix Kotlin duplicate classes
        run: |
          cat >> TransportApp/app/build.gradle <<'EOT'

          dependencies {
              implementation platform('org.jetbrains.kotlin:kotlin-bom:1.8.22')
          }
          EOT
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'
      - uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: '8.9'
      - name: Build debug APK
        working-directory: TransportApp
        run: gradle assembleDebug --no-daemon
      - uses: actions/upload-artifact@v4
        with:
          name: apk
          path: TransportApp/app/build/outputs/apk/debug/app-debug.apk
