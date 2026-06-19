# Retrofit / Gson
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.notesreminders.app.data.api.** { *; }
-dontwarn okhttp3.**
-dontwarn retrofit2.**

# Room
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-dontwarn androidx.room.paging.**

# Compose
-dontwarn androidx.compose.**
