package com.notesreminders.app.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.notesreminders.app.NotesApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        val pending = goAsync()
        val app = context.applicationContext as NotesApp
        CoroutineScope(Dispatchers.IO).launch {
            try {
                ReminderReconciler(context, app.database.reminderDao()).reconcile()
            } finally {
                pending.finish()
            }
        }
    }
}
