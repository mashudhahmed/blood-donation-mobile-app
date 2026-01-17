plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
    id("kotlin-parcelize")
    // Add if using Room:
    // id("kotlin-kapt")
}

android {
    namespace = "com.project.donateblood"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.project.donateblood"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables.useSupportLibrary = true

        buildConfigField(
            "String",
            "BASE_URL",
            "\"https://donate-blood-app.onrender.com/\""
        )
    }

    buildFeatures {
        viewBinding = true
        buildConfig = true
        // REMOVED: compose = false since you're not using Compose
    }

    // REMOVED: composeOptions block since you're not using Compose

    buildTypes {
        debug {
            isDebuggable = true
            isMinifyEnabled = false
            isShrinkResources = false
            versionNameSuffix = "-DEBUG"
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }

        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    // REPLACED: Old kotlinOptions with new compilerOptions DSL
    kotlin {
        jvmToolchain(17)
    }

    // Alternative solution for jvmTarget using compilerOptions:
    // compileOptions {
    //     sourceCompatibility = JavaVersion.VERSION_17
    //     targetCompatibility = JavaVersion.VERSION_17
    // }
    //
    // kotlinOptions {
    //     jvmTarget = "17"
    // }

    packaging {
        resources {
            excludes += setOf(
                "META-INF/AL2.0",
                "META-INF/LGPL2.1",
                "META-INF/DEPENDENCIES",
                "META-INF/LICENSE*",
                "META-INF/NOTICE*",
                "META-INF/*.kotlin_module"
            )
        }
    }
}

dependencies {

    // ================= CORE =================
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.fragment:fragment-ktx:1.6.2")

    // ================= LIFECYCLE =================
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.8.3")
    implementation("androidx.lifecycle:lifecycle-livedata-ktx:2.8.3")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.3")

    // ================= NAVIGATION =================
    implementation("androidx.navigation:navigation-fragment-ktx:2.7.7")
    implementation("androidx.navigation:navigation-ui-ktx:2.7.7")

    // ================= COROUTINES =================
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3")

    // ================= FIREBASE (BOM) =================
    implementation(platform("com.google.firebase:firebase-bom:33.6.0"))
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.firebase:firebase-firestore-ktx")  // 🔥 ADDED FOR FIRESTORE
    implementation("com.google.firebase:firebase-storage-ktx")
    implementation("com.google.firebase:firebase-analytics-ktx")
    implementation("com.google.firebase:firebase-messaging-ktx")

    // ================= UI =================
    implementation("io.coil-kt:coil:2.5.0")  // For image loading
    implementation("de.hdodenhof:circleimageview:3.1.0")
    implementation("com.airbnb.android:lottie:6.4.0")
    implementation("com.facebook.shimmer:shimmer:0.5.0")

    // ================= UTIL =================
    implementation("com.github.dhaval2404:imagepicker:2.1")
    implementation("com.karumi:dexter:6.2.3")
    implementation("com.wdullaer:materialdatetimepicker:4.2.3")

    // ================= LOGGING =================
    implementation("com.jakewharton.timber:timber:5.0.1")

    // ================= NETWORK =================
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    // ================= TEST =================
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")

    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
}