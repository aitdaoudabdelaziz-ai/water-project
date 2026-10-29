package com.wydad.asserghine;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintJob;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import androidx.webkit.WebViewAssetLoader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Scanner;

public class MainActivity extends Activity {
    private WebView web;
    private ValueCallback<Uri[]> fileCb;
    private static final int PICK = 7;
    private String bridgeJs = "";

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        try (InputStream in = getAssets().open("bridge.js"); Scanner s = new Scanner(in, "UTF-8").useDelimiter("\\A")) {
            bridgeJs = s.hasNext() ? s.next() : "";
        } catch (Exception ignored) {}

        web = new WebView(this);
        setContentView(web);
        WebSettings ws = web.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setDatabaseEnabled(true);
        ws.setAllowFileAccess(false);
        ws.setTextZoom(100);
        ws.setMediaPlaybackRequiresUserGesture(false);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();

        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                return loader.shouldInterceptRequest(r.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if ("appassets.androidplatform.net".equals(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
                return true;
            }
            @Override public void onPageFinished(WebView v, String url) { v.evaluateJavascript(bridgeJs, null); }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb;
                try { startActivityForResult(p.createIntent(), PICK); }
                catch (Exception e) {
                    Intent i = new Intent(Intent.ACTION_GET_CONTENT); i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("*/*");
                    startActivityForResult(i, PICK);
                }
                return true;
            }
        });
        web.addJavascriptInterface(new Bridge(), "AndroidApp");
        if (b != null) web.restoreState(b);
        else web.loadUrl("https://appassets.androidplatform.net/assets/index.html");
    }

    @Override protected void onSaveInstanceState(Bundle o) { super.onSaveInstanceState(o); web.saveState(o); }

    @Override protected void onActivityResult(int req, int res, Intent data) {
        if (req == PICK && fileCb != null) {
            fileCb.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data));
            fileCb = null;
            return;
        }
        super.onActivityResult(req, res, data);
    }

    @Override public void onBackPressed() {
        new AlertDialog.Builder(this).setMessage("الخروج من التطبيق؟")
                .setPositiveButton("نعم", (d, w) -> finish())
                .setNegativeButton("لا", null).show();
    }

    class Bridge {
        @JavascriptInterface public void saveFile(String name, String mime, String b64) {
            final byte[] data = Base64.decode(b64, Base64.DEFAULT);
            runOnUiThread(() -> {
                try {
                    Uri saved = null;
                    if (Build.VERSION.SDK_INT >= 29) {
                        ContentValues cv = new ContentValues();
                        cv.put(MediaStore.Downloads.DISPLAY_NAME, name);
                        cv.put(MediaStore.Downloads.MIME_TYPE, mime);
                        cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                        saved = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                        try (OutputStream os = getContentResolver().openOutputStream(saved)) { os.write(data); }
                    }
                    File dir = new File(getCacheDir(), "out"); dir.mkdirs();
                    File f = new File(dir, name);
                    try (FileOutputStream fo = new FileOutputStream(f)) { fo.write(data); }
                    Uri share = FileProvider.getUriForFile(MainActivity.this, "com.wydad.asserghine.files", f);
                    Toast.makeText(MainActivity.this, saved != null ? "تم الحفظ في مجلد التنزيلات: " + name : name, Toast.LENGTH_LONG).show();
                    Intent s = new Intent(Intent.ACTION_SEND);
                    s.setType(mime); s.putExtra(Intent.EXTRA_STREAM, share);
                    s.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(Intent.createChooser(s, "مشاركة / حفظ الملف"));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "تعذّر حفظ الملف: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            });
        }

        @JavascriptInterface public void print(String title) {
            runOnUiThread(() -> {
                PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
                PrintDocumentAdapter ad = web.createPrintDocumentAdapter(title);
                pm.print(title, ad, new PrintAttributes.Builder().build());
                web.postDelayed(() -> web.evaluateJavascript("window.__afterPrint&&__afterPrint()", null), 1500);
            });
        }
    }
}
