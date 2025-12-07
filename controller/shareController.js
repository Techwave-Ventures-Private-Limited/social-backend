const mongoose = require('mongoose');
const User = require('../modules/user');
const Post = require('../modules/post');
const Showcase = require('../modules/showcase');

// CONFIGURATION
const APP_SCHEME = "connektx"; // This results in connektx://
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=app.rork.connektx"; // REPLACE WITH YOUR ID
const APP_STORE_URL = "https://apps.apple.com/us/app/connektx/id123456789"; // REPLACE WITH YOUR ID
const DEFAULT_IMAGE = "https://connektx.com/favicon.png"; // Fallback image

exports.serveSharePage = async (req, res) => {
  const { type, id } = req.params;

  // 1. Validate ObjectId to prevent MongoDB crashes
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).send("Invalid Content ID");
  }

  // 2. Default Meta Data (Fallback)
  let meta = {
    title: "Check out ConnektX",
    description: "The professional network for the future.",
    image: DEFAULT_IMAGE
  };

  try {
    // 3. Fetch Data Based on Type using YOUR specific Schema fields
    switch (type) {
      case 'profile':
        // Schema: name, headline, bio, profileImage
        const user = await User.findById(id).select('name headline bio profileImage');
        if (user) {
          meta.title = `${user.name} on ConnektX`;
          // Prioritize headline, fallback to bio
          meta.description = user.headline || user.bio || "View professional profile";
          meta.image = user.profileImage || DEFAULT_IMAGE;
        }
        break;

      case 'post':
        // Schema: authorId (ref User), discription (sic), media ([String])
        const post = await Post.findById(id).populate('authorId', 'name');
        
        if (post) {
          const authorName = post.authorId ? post.authorId.name : (post.authorName || "Someone");
          
          meta.title = `Post by ${authorName}`;
          
          // Fix: Schema uses 'discription' (with an 'i')
          const rawText = post.discription || "Check out this post";
          meta.description = rawText.substring(0, 150) + (rawText.length > 150 ? "..." : "");
          
          // Fix: Schema uses 'media' array. Grab the first image if available.
          if (post.media && post.media.length > 0) {
            meta.image = post.media[0]; 
          } else {
            meta.image = post.authorAvatar || DEFAULT_IMAGE;
          }
        }
        break;

      case 'showcase':
        // Schema: projectTitle, tagline, description, bannerImageUrl, logo
        const showcase = await Showcase.findById(id);
        if (showcase) {
          // Fix: Schema uses 'projectTitle', not 'title'
          meta.title = showcase.projectTitle || "Project Showcase";
          
          // Fix: Prioritize tagline, fallback to description
          const descText = showcase.tagline || showcase.description || "View this project on ConnektX";
          meta.description = descText.substring(0, 150);
          
          // Fix: Prioritize banner, fallback to logo
          meta.image = showcase.bannerImageUrl || showcase.logo || DEFAULT_IMAGE;
        }
        break;

      default:
        console.warn(`[Share] Unknown type requested: ${type}`);
    }
  } catch (error) {
    console.error("[Share] Error fetching data:", error);
    // Don't crash response, just serve default meta tags so the link still works
  }

  // 4. Construct Deep Link (e.g. connektx://post/123)
  const deepLink = `${APP_SCHEME}://${type}/${id}`;

  // 5. Generate HTML
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${meta.title}</title>

      <meta property="og:type" content="website" />
      <meta property="og:title" content="${meta.title}" />
      <meta property="og:description" content="${meta.description}" />
      <meta property="og:image" content="${meta.image}" />
      <meta property="og:url" content="https://share.connektx.com/share/${type}/${id}" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${meta.title}" />
      <meta name="twitter:description" content="${meta.description}" />
      <meta name="twitter:image" content="${meta.image}" />

      <style>
        body { font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background-color: #121212; color: #ffffff; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; }
        .logo-container { width: 80px; height: 80px; margin-bottom: 20px; border-radius: 15px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        .logo-img { width: 100%; height: 100%; object-fit: cover; }
        h1 { font-size: 20px; margin-bottom: 10px; font-weight: 700; max-width: 90%; }
        p { color: #aaaaaa; max-width: 400px; line-height: 1.5; margin-bottom: 30px; font-size: 15px; }
        .btn { display: inline-block; background: linear-gradient(90deg, #3B82F6 0%, #2563EB 100%); color: white; padding: 14px 35px; border-radius: 30px; text-decoration: none; font-weight: 600; font-size: 16px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4); transition: transform 0.2s; }
        .btn:active { transform: scale(0.98); }
        .store-links { font-size: 13px; margin-top: 10px; opacity: 0.8; }
        .store-links a { color: #60A5FA; text-decoration: none; margin: 0 8px; }
      </style>
    </head>
    <body>
      <div class="logo-container">
        <img src="${meta.image}" class="logo-img" alt="Preview" onerror="this.src='${DEFAULT_IMAGE}'" />
      </div>
      
      <h1>${meta.title}</h1>
      <p>${meta.description}</p>

      <a href="${deepLink}" class="btn">Open in App</a>

      <div class="store-links">
        <p>If the app doesn't open automatically:</p>
        <a href="${PLAY_STORE_URL}">Android</a> • <a href="${APP_STORE_URL}">iOS</a>
      </div>

      <script>
        window.onload = function() {
          // 1. Try to open the app via Deep Link
          window.location.href = "${deepLink}";

          // 2. Optional: Fallback logic (commented out to avoid accidental redirects)
          /*
          setTimeout(function() {
             var userAgent = navigator.userAgent || navigator.vendor || window.opera;
             if (/android/i.test(userAgent)) {
                 window.location.href = "${PLAY_STORE_URL}";
             } else if (/iPad|iPhone|iPod/.test(userAgent)) {
                 window.location.href = "${APP_STORE_URL}";
             }
          }, 2500);
          */
        };
      </script>
    </body>
    </html>
  `;

  res.send(html);
};