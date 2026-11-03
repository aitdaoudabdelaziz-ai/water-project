package ma.gestion.stock;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
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

import androidx.webkit.WebViewAssetLoader;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final int FILE_REQ = 41;
    private static final String HOST = "appassets.androidplatform.net";
    private WebView web;
    private ValueCallback<Uri[]> fileCb;
    private final Object lock = new Object();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(true);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (HOST.equals(u.getHost())) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (Exception ignored) {
                }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb;
                String type = "*/*";
                String[] acc = params.getAcceptTypes();
                if (acc != null && Arrays.toString(acc).contains("image")) type = "image/*";
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType(type);
                try {
                    startActivityForResult(Intent.createChooser(i, "Choisir un fichier"), FILE_REQ);
                } catch (ActivityNotFoundException e) {
                    fileCb = null;
                    return false;
                }
                return true;
            }
        });

        web.addJavascriptInterface(new Bridge(), "AndroidStore");
        if (savedInstanceState == null) {
            web.loadUrl("https://" + HOST + "/assets/index.html");
        } else {
            web.restoreState(savedInstanceState);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_REQ) {
            if (fileCb != null) {
                Uri[] res = null;
                if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                    res = new Uri[]{data.getData()};
                }
                fileCb.onReceiveValue(res);
                fileCb = null;
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        web.evaluateJavascript("(window.__back && window.__back()) ? '1' : '0'", v -> {
            if (!"\"1\"".equals(v)) finish();
        });
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.evaluateJavascript("try{if(window.flushAndroid&&andT)flushAndroid()}catch(e){}", null);
    }

    private File dataFile() {
        return new File(getFilesDir(), "donnees.json");
    }

    private static String mimeOf(String name) {
        String n = name.toLowerCase(Locale.ROOT);
        if (n.endsWith(".pdf")) return "application/pdf";
        if (n.endsWith(".csv")) return "text/csv";
        if (n.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }

    private class Bridge {
        @JavascriptInterface
        public String load() {
            synchronized (lock) {
                File f = dataFile();
                if (!f.exists()) return "{}";
                try (InputStream in = new FileInputStream(f)) {
                    byte[] b = new byte[(int) f.length()];
                    int off = 0, r;
                    while (off < b.length && (r = in.read(b, off, b.length - off)) > 0) off += r;
                    return new String(b, 0, off, StandardCharsets.UTF_8);
                } catch (IOException e) {
                    return "{}";
                }
            }
        }

        @JavascriptInterface
        public boolean save(String json) {
            if (json == null || json.isEmpty()) return false;
            synchronized (lock) {
                try {
                    byte[] b = json.getBytes(StandardCharsets.UTF_8);
                    File f = dataFile();
                    File tmp = new File(getFilesDir(), "donnees.json.tmp");
                    try (FileOutputStream o = new FileOutputStream(tmp)) {
                        o.write(b);
                        o.getFD().sync();
                    }
                    if (!tmp.renameTo(f)) {
                        f.delete();
                        if (!tmp.renameTo(f)) return false;
                    }
                    File dir = new File(getFilesDir(), "sauvegardes");
                    dir.mkdirs();
                    String day = new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(new Date());
                    try (FileOutputStream o = new FileOutputStream(new File(dir, "donnees-" + day + ".json"))) {
                        o.write(b);
                    }
                    String[] names = dir.list();
                    if (names != null && names.length > 60) {
                        Arrays.sort(names);
                        for (int i = 0; i < names.length - 60; i++) new File(dir, names[i]).delete();
                    }
                    return true;
                } catch (IOException e) {
                    return false;
                }
            }
        }

        @JavascriptInterface
        public String saveFile(String name, String b64) {
            try {
                String safe = name.replaceAll("[\\\\/:*?\"<>|]", "_");
                byte[] bytes = Base64.decode(b64, Base64.DEFAULT);
                String mime = mimeOf(safe);
                Uri uri;
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentResolver cr = getContentResolver();
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.MediaColumns.DISPLAY_NAME, safe);
                    cv.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                    cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/GestionStock");
                    uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                    if (uri == null) return "Enregistrement impossible";
                    try (OutputStream o = cr.openOutputStream(uri)) {
                        if (o == null) return "Enregistrement impossible";
                        o.write(bytes);
                    }
                } else {
                    File dir = new File(getExternalFilesDir(null), "GestionStock");
                    dir.mkdirs();
                    File f = new File(dir, safe);
                    try (FileOutputStream o = new FileOutputStream(f)) {
                        o.write(bytes);
                    }
                    return "Enregistré : " + f.getAbsolutePath();
                }
                if (mime.equals("application/pdf")) {
                    final Uri u = uri;
                    runOnUiThread(() -> {
                        try {
                            Intent v = new Intent(Intent.ACTION_VIEW);
                            v.setDataAndType(u, "application/pdf");
                            v.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            startActivity(Intent.createChooser(v, "Ouvrir la facture"));
                        } catch (Exception ignored) {
                        }
                    });
                }
                return "Enregistré dans Téléchargements/GestionStock";
            } catch (Exception e) {
                return "Erreur : " + e.getMessage();
            }
        }

        @JavascriptInterface
        public void print(final String title) {
            runOnUiThread(() -> {
                PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
                String t = (title == null || title.isEmpty()) ? "Facture" : title;
                pm.print(t, web.createPrintDocumentAdapter(t),
                        new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
            });
        }
    }
}
