plugins {
    id("com.android.application") version "8.13.2" apply false
    id("org.jetbrains.kotlin.android") version "2.2.21" apply false
    id("com.google.gms.google-services") version "4.4.4" apply false
    id("com.google.devtools.ksp") version "1.9.0-1.0.13" apply false
    // REMOVE THIS LINE: id("kotlin-parcelize") version "2.2.21" apply false
}

tasks.register("clean", Delete::class) {
    delete(rootProject.layout.buildDirectory)
}