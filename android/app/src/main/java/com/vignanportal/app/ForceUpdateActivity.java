package com.vignanportal.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;

/**
 * ForceUpdateActivity — A full-screen, non-dismissable update screen.
 *
 * Shown when the installed app version is older than the minimum required
 * version fetched from the backend. The user cannot close, skip, or navigate
 * away from this screen. The only action is "Update Now" which opens the
 * Play Store listing.
 */
public class ForceUpdateActivity extends AppCompatActivity {

    private static final String PLAY_STORE_URL =
            "https://play.google.com/store/apps/details?id=com.vignanportal.app&hl=en";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_force_update);

        // ── "Update Now" button → Play Store ──
        View btnUpdate = findViewById(R.id.btnUpdateNow);
        btnUpdate.setOnClickListener(v -> {
            try {
                // Try Play Store app first
                Intent intent = new Intent(Intent.ACTION_VIEW,
                        Uri.parse("market://details?id=com.vignanportal.app"));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
            } catch (android.content.ActivityNotFoundException e) {
                // Fallback to browser
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(PLAY_STORE_URL));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
            }
        });

        // ── Block the hardware back button ──
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                Toast.makeText(ForceUpdateActivity.this,
                        "Please update to continue", Toast.LENGTH_SHORT).show();
            }
        });
    }
}
