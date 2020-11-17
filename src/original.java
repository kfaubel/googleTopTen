package org.faubel.daydreamone;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.Typeface;

import org.json.JSONException;
import org.json.JSONObject;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;

//  https://www.google.com/trends/hottrends/atom/feed?pn=p1
//
// Sample of the XML data returned:
//
//  <?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
//    <rss version="2.0" xmlns:ht="http://www.google.com/trends/hottrends" xmlns:atom="http://www.w3.org/2005/Atom">
//      <channel>
//        <title>Hot Trends</title>
//        ...
//        <item>
//          <title>Portland Weather</title>
//          ...
//          <ht:picture>//t1.gstatic.com/images?q=tbn:ANd9GcSqgIRL8a12lCZ5R7Yu1KHc_GPTEUF0BjUk-Mv8AMUjAdT22XKu6PZzIt-mg9w4vpQtBHjlsuyD</ht:picture>
//          ...
//          <ht:news_item>
//            <ht:news_item_title>A foot of snow has fallen and it&amp;#39;s not over yet</ht:news_item_title>
//            <ht:news_item_snippet>&lt;b&gt;PORTLAND&lt;/b&gt;, Ore. -- Snow will continue until early Wednesday afternoon in the &lt;b&gt;Portland&lt;/b&gt; area, adding 2 to five 5 to the foot that fell overnight, according to the National &lt;b&gt;Weather&lt;/b&gt; Service. Snow began sticking in &lt;b&gt;Portland&lt;/b&gt; at around 5 p.m, and then fell at &lt;b&gt;...&lt;/b&gt;</ht:news_item_snippet>
//            <ht:news_item_url>http://www.kgw.com/weather/more-snow-already-on-the-horizon-after-ice-storm/384529373</ht:news_item_url>
//            <ht:news_item_source>kgw.com</ht:news_item_source>
//          </ht:news_item>
//        </item>
//        <item>
//          ...

public class DisplayTrends implements DisplayItem, DataSource {
    private static final String TAG = "DisplayTrends";
    private final Object lock = new Object();
    private String friendlyName;
    private String xmlURLStr;
    private long expirationPeriodMins;
    private long displayDurationSecs;
    private ArrayList<Trend> trendList;  // This must be synchronized since the cache thread and the UI thread both use it.
    private final Context context;
    private final UpdateScheduler updateScheduler;

    private class Trend {
        // We use this as a struct so we will just make the members public and not use getters and setters
        public final String title;
        public final String description;
        final byte[] bitmapByteArray;

        public int getSpace() {
            return bitmapByteArray.length;
        }

        Trend(String title, String description, byte[] bitmapByteArray) {
            this.title           = title;
            this.description     = description;
            this.bitmapByteArray = bitmapByteArray;
        }
    }

    DisplayTrends(Context context, JSONObject configData, ContentManager ContentManager) {
        this.context = context;
        try {
            this.friendlyName         = configData.getString("friendlyName");
            this.expirationPeriodMins = configData.getLong("expirationPeriodMins"); // Not used
            this.displayDurationSecs  = configData.getLong("displayDurationSecs");

            this.xmlURLStr             = configData.getString("resource");
        } catch (JSONException e) {
            Klog.e(TAG, "constructor" + e.toString());
            e.printStackTrace();
        }

        Klog.i(TAG, "Creating: " + friendlyName);

        trendList = new ArrayList<>();

        ContentManager.addModel(this);

        updateScheduler = new UpdateScheduler(expirationPeriodMins, 0, true);
    }

    @Override
    public String getTAG() { return TAG;}

    @Override
    public String getFriendlyName() { return friendlyName;}

    @Override
    public long getDisplayDurationSecs() {
        return displayDurationSecs;
    }

    @Override
    public int size() {

        // Prevent access while it is being updated.
        synchronized(lock) {
           if (trendList.size() < 10) {
                return trendList.size(); // Could be 0
            } else {
                return 10;
            }
        }
    }

    @Override
    public Bitmap getBitmap(int index) {

        Trend trend;

        synchronized(lock) {
            // Since the TrendList may have changed, we need to do one more check to make sure the index is valid
            if (trendList.size() == 0) {
                Klog.e(TAG, "trendList is empty");
                return null;
            }

            if (index < 0 || index > trendList.size()) {
                Klog.e(TAG, "Request to get bad index: " + index);
                return null;
            }

            // Access the trend when we know the List is not being updated
            trend = trendList.get(index);
        }

        // We have a trend that cannot be changed by update()
        if (trend == null) {
            return null;
        }

        Bitmap imageBitmap = Bitmap.createBitmap(1024, 600, Bitmap.Config.RGB_565);

        // Create a canvas that lets us do all the drawing on the bitmap
        Canvas canvas = new Canvas(imageBitmap);
        Paint p = new Paint();
        Rect bounds = new Rect();

        canvas.drawRGB(255, 255, 255);

        p.setTypeface(Typeface.create("sans-serif-black", Typeface.NORMAL));
        p.setColor(Color.BLUE);
        p.setTextSize(80);

        String title = "#" + (index+1) + " " + trend.title;
        List<String> lines = Utils.splitLine(title, 22, 3);

        int yOffset = 120;
        for (String line : lines) {
            canvas.drawText(line, 75, yOffset, p);
            yOffset += 90;
        }

        // We could show a description of each trend but its too cluttered
        //p.setTypeface(Typeface.create("sans-serif", Typeface.NORMAL));
        //p.setColor(Color.BLACK);
        //p.setTextSize(25);
        //p.getTextBounds(timeStr, 0, timeStr.length(), bounds);
        //canvas.drawText(trend.description, 30, 170, p);
        Bitmap trendImage = Utils.getBitmapFromByteArray(trend.bitmapByteArray, 250, 0);

        // If we have an image as part of the trend, draw it now.
        if (trendImage != null) {
            Bitmap resizedBitmap = Utils.getResizedBitmap(trendImage, 250, 250);

            canvas.drawBitmap(resizedBitmap, 512, 250, null);
        }

        Date now = new Date();
        String timeStr = new SimpleDateFormat("h:mm a", Locale.US).format(now);
        p.setTypeface(Typeface.create("sans-serif-black", Typeface.NORMAL));
        p.setColor(Color.rgb(0,0, 100));
        p.setTextSize(36);
        canvas.drawText(timeStr, 800, 590, p);
        return imageBitmap;
    }

    @Override
    public void update() {
        if (!updateScheduler.shouldUpdateNow()) {
            return;
        }

        Klog.i(TAG, "Updating: " + friendlyName);

        // Fill a tempo list since the UI thread may still be accessing the old one.
        ArrayList<Trend> tempTrendList = new ArrayList<>();
        Document doc;

        try {
            DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
            DocumentBuilder db;
            db = dbf.newDocumentBuilder();

            java.net.URL xmlURL = new URL(xmlURLStr);
            doc = db.parse(new InputSource(xmlURL.openStream()));
            doc.getDocumentElement().normalize();
        } catch (Exception e) {
            Klog.e(TAG, "Trend info retreval failed: " + e.toString());
            return;
        }

        try {
            NodeList nodeList = doc.getElementsByTagName("item");

            if (nodeList != null) {
                // Walk through each <item> and extract the data.
                for (int i = 0; i < nodeList.getLength(); i++) {
                    Node node = nodeList.item(i);
                    Element el = (Element) node;

                    String title = el.getElementsByTagName("title").item(0).getTextContent();
                    String description = el.getElementsByTagName("ht:news_item_title").item(0).getTextContent();
                    String pictureURL = el.getElementsByTagName("ht:picture").item(0).getTextContent();
                    //    Bitmap bitmap      = Utils.loadBitmap("https:" + pictureURL); // Could be null but thats OK
                    byte[] byteArray = Utils.loadBitmapByteArray(pictureURL, 500000);

                    Klog.i(TAG, "Updating Title:       " + title);

                    description = description.replaceAll("&amp;", "&");
                    description = description.replaceAll("<b>", "");
                    description = description.replaceAll("</b>", "");
                    description = description.replaceAll("&#39;", "'");


                    Klog.v(TAG, "Description: " + description);
                    Klog.v(TAG, "PictureURL:  " + pictureURL);

                    tempTrendList.add(new Trend(title, description, byteArray));
                    updateScheduler.updateSuccessful();
                }
            } else {
                Klog.e(TAG, "NodeList was null");
                // This will count as a successful download even though the data was bad.  No point in trying again.
                updateScheduler.updateFailed();
            }
        } catch (Exception e) {
            Klog.e(TAG, e.toString());
            updateScheduler.updateFailed();
        }

        // Block the UI thread from using trendList while we change it.
        synchronized(lock) {
            trendList = tempTrendList;
        }
    }
}