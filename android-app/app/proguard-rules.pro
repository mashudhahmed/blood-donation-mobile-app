# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ==============================================
# REQUIRED FOR UCROP (IMAGE CROPPING LIBRARY)
# ==============================================
-keep class com.yalantis.ucrop.** { *; }
-keep interface com.yalantis.ucrop.** { *; }
-dontwarn com.yalantis.ucrop.**

# ==============================================
# REQUIRED FOR FIREBASE
# ==============================================
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# Firebase Authentication
-keep class com.google.firebase.auth.** { *; }

# Firebase Firestore
-keep class com.google.firebase.firestore.** { *; }

# Firebase Storage
-keep class com.google.firebase.storage.** { *; }

# ==============================================
# REQUIRED FOR MATERIAL DESIGN COMPONENTS
# ==============================================
-keep class com.google.android.material.** { *; }
-keep interface com.google.android.material.** { *; }
-dontwarn com.google.android.material.**

# ==============================================
# REQUIRED FOR KOTLIN COROUTINES
# ==============================================
-keepclassmembers class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepclassmembers class kotlinx.coroutines.CoroutineExceptionHandler {}

# ==============================================
# REQUIRED FOR CIRCLE IMAGE VIEW
# ==============================================
-keep class de.hdodenhof.circleimageview.** { *; }

# ==============================================
# REQUIRED FOR LOTTIE ANIMATIONS
# ==============================================
-keep class com.airbnb.lottie.** { *; }

# ==============================================
# REQUIRED FOR COIL IMAGE LOADING
# ==============================================
-keep class coil.** { *; }
-dontwarn coil.**

# ==============================================
# REQUIRED FOR IMAGE COMPRESSOR
# ==============================================
-keep class id.zelory.compressor.** { *; }

# ==============================================
# REQUIRED FOR PERMISSIONX
# ==============================================
-keep class com.guolindev.permissionx.** { *; }

# ==============================================
# REQUIRED FOR SHIMMER LOADING
# ==============================================
-keep class com.facebook.shimmer.** { *; }

# ==============================================
# GENERAL ANDROID RULES
# ==============================================
# Keep View constructors and setters for view inflation
-keepclassmembers class * extends android.view.View {
   public <init>(android.content.Context);
   public <init>(android.content.Context, android.util.AttributeSet);
   public <init>(android.content.Context, android.util.AttributeSet, int);
   public void set*(...);
}

# Keep annotations
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# Keep parcelable classes
-keep class * implements android.os.Parcelable {
  public static final android.os.Parcelable$Creator *;
}

# Keep serializable classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep custom view getters and setters
-keepclassmembers public class * extends android.view.View {
   void set*(***);
   *** get*();
}

# For navigation components
-keep class androidx.navigation.** { *; }

# For activity result API
-keep class androidx.activity.result.** { *; }

# For cameraX
-keep class androidx.camera.** { *; }
-dontwarn androidx.camera.**

# For view binding
-keep class * extends androidx.viewbinding.ViewBinding {
    public static * inflate(...);
}

# Keep line numbers for stack traces (optional but helpful for debugging)
-keepattributes SourceFile,LineNumberTable

# If you want to obfuscate source file names in release builds
#-renamesourcefileattribute SourceFile