const API_BASE_URL = "https://interstellar-backend-owfb.onrender.com";

const authPage = document.getElementById("auth-page");
const loginPage = document.getElementById("login-page");
const app = document.getElementById("app");
const bottomNav = document.getElementById("bottom-nav");

const signupForm = document.getElementById("signup-form");
const loginForm = document.getElementById("login-form");

const signupMessage =
    document.getElementById("signup-message");

const loginMessage =
    document.getElementById("login-message");

const showLoginButton =
    document.getElementById("show-login");

const showSignupButton =
    document.getElementById("show-signup");

const videoFeed =
    document.getElementById("video-feed");

const navButtons =
    document.querySelectorAll("#bottom-nav button");

const pages =
    document.querySelectorAll(".page");


/* =========================================
   AUTHENTICATION STATE
========================================= */

function getCurrentUserId() {

    return localStorage.getItem(
        "interstellar_user_id"
    );
}


function getAccessToken() {
    return localStorage.getItem(
        "interstellar_access_token"
    );
}

function saveTokens(tokens) {
    if (!tokens || !tokens.accessToken) {
        throw new Error("Authentication tokens were not returned.");
    }

    localStorage.setItem(
        "interstellar_access_token",
        tokens.accessToken
    );

    if (tokens.refreshToken) {
        localStorage.setItem(
            "interstellar_refresh_token",
            tokens.refreshToken
        );
    }
}

async function refreshAccessToken() {
    const refreshToken = localStorage.getItem(
        "interstellar_refresh_token"
    );

    if (!refreshToken) {
        throw new Error("Please log in again.");
    }

    const response = await fetch(
        `${API_BASE_URL}/v1/auth/refresh`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken })
        }
    );

    if (!response.ok) {
        localStorage.removeItem("interstellar_access_token");
        localStorage.removeItem("interstellar_refresh_token");
        throw new Error("Your session expired. Please log in again.");
    }

    const result = await response.json();
    saveTokens(result.tokens);
    return result.tokens.accessToken;
}


function saveCurrentUser(user) {

    if (!user || !user.userId) {
        return;
    }

    localStorage.setItem(
        "interstellar_user_id",
        user.userId
    );
}


/* =========================================
   AUTH SCREEN
========================================= */

function showSignup() {
    authPage.style.display = "flex";
    loginPage.style.display = "none";
    app.style.display = "none";
    bottomNav.style.display = "none";
    document.getElementById("floating-create-button").style.display = "none";

    signupMessage.textContent = "";
    loginMessage.textContent = "";
}

function showLogin() {
    authPage.style.display = "none";
    loginPage.style.display = "flex";
    app.style.display = "none";
    bottomNav.style.display = "none";
    document.getElementById("floating-create-button").style.display = "none";

    signupMessage.textContent = "";
    loginMessage.textContent = "";
}

function showApplication() {
    authPage.style.display = "none";
    loginPage.style.display = "none";
    app.style.display = "block";
    bottomNav.style.display = "flex";
    document.getElementById("floating-create-button").style.display = "flex";
}


/* =========================================
   BACKEND ERROR HANDLING
========================================= */

async function getErrorMessage(response) {
    try {
        const data = await response.json();

        if (data?.error?.message) {
            return data.error.message;
        }

        if (data?.message) {
            return data.message;
        }

        return `Request failed: ${response.status}`;

    } catch (error) {
        return `Request failed: ${response.status}`;
    }
}


/* =========================================
   SIGN UP
========================================= */

signupForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        const username =
            document.getElementById(
                "signup-username"
            ).value.trim();

        const email =
            document.getElementById(
                "signup-email"
            ).value.trim();

        const password =
            document.getElementById(
                "signup-password"
            ).value;

        const confirmPassword =
            document.getElementById(
                "signup-confirm-password"
            ).value;

        const signupButton =
            document.getElementById(
                "signup-button"
            );


        signupMessage.textContent = "";


        /* PASSWORD CONFIRMATION */

        if (password !== confirmPassword) {

            signupMessage.textContent =
                "Passwords do not match.";

            return;
        }


        /* BASIC VALIDATION */

        if (username.length < 3) {

            signupMessage.textContent =
                "Username must be at least 3 characters.";

            return;
        }

        if (password.length < 8) {

            signupMessage.textContent =
                "Password must be at least 8 characters.";

            return;
        }


        signupButton.disabled = true;
        signupButton.textContent =
            "Creating account...";


        try {

            /* CREATE ACCOUNT */

            const registerResponse =
                await fetch(
                    `${API_BASE_URL}/v1/users`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            username: username,
                            email: email,

                            /*
                             * The current backend requires
                             * display_name.
                             *
                             * Until we add a separate
                             * display-name field to the UI,
                             * use the username.
                             */

                            display_name: username,

                            password: password
                        })
                    }
                );


            if (!registerResponse.ok) {

                const message =
                    await getErrorMessage(
                        registerResponse
                    );

                throw new Error(message);
            }


            /* AUTOMATIC LOGIN */

            const loginResponse =
                await fetch(
                    `${API_BASE_URL}/v1/auth/login`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            identifier: username,
                            password: password
                        })
                    }
                );


            if (!loginResponse.ok) {

                const message =
                    await getErrorMessage(
                        loginResponse
                    );

                throw new Error(
                    `Account created, but automatic login failed: ${message}`
                );
            }


            const loginData =
                await loginResponse.json();


            saveTokens(loginData.tokens);
            saveCurrentUser(loginData.user);


            signupMessage.textContent =
                "Account created successfully!";


            signupForm.reset();


            /* ENTER THE APP */

            showApplication();

            switchPage("home-page");

            await loadVideos();


        } catch (error) {

            console.error(
                "SIGN UP ERROR:",
                error
            );

            signupMessage.textContent =
                error.message ||
                "Unable to create account.";

        } finally {

            signupButton.disabled = false;

            signupButton.textContent =
                "Create Account";
        }
    }
);


/* =========================================
   LOGIN
========================================= */

loginForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        const identifier =
            document.getElementById(
                "login-identifier"
            ).value.trim();

        const password =
            document.getElementById(
                "login-password"
            ).value;

        const loginButton =
            document.getElementById(
                "login-button"
            );


        loginMessage.textContent = "";

        loginButton.disabled = true;
        loginButton.textContent =
            "Logging in...";


        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/v1/auth/login`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            identifier: identifier,
                            password: password
                        })
                    }
                );


            if (!response.ok) {

                const message =
                    await getErrorMessage(
                        response
                    );

                throw new Error(message);
            }


            const data =
                await response.json();


            saveTokens(data.tokens);
            saveCurrentUser(data.user);


            loginForm.reset();


            /* ENTER THE APP */

            showApplication();

            switchPage("home-page");

            await loadVideos();


        } catch (error) {

            console.error(
                "LOGIN ERROR:",
                error
            );

            loginMessage.textContent =
                error.message ||
                "Unable to log in.";

        } finally {

            loginButton.disabled = false;

            loginButton.textContent =
                "Log In";
        }
    }
);


/* =========================================
   AUTH NAVIGATION
========================================= */

showLoginButton.addEventListener(
    "click",
    showLogin
);

showSignupButton.addEventListener(
    "click",
    showSignup
);


/* =========================================
   VIDEO FEED
========================================= */

async function loadVideos() {

    showMessage("Loading videos...");


    const accessToken =
        getAccessToken();


    if (!accessToken) {

        showLogin();

        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/v1/videos`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${accessToken}`
                    }
                }
            );


        if (!response.ok) {

            if (response.status === 401) {

                localStorage.removeItem(
                    "interstellar_access_token"
                );

                localStorage.removeItem(
                    "interstellar_refresh_token"
                );

                showLogin();

                loginMessage.textContent =
                    "Your session has expired. Please log in again.";

                return;
            }


            const message =
                await getErrorMessage(
                    response
                );

            throw new Error(message);
        }


        const data =
            await response.json();


        console.log(
            "VIDEOS FROM BACKEND:",
            data
);
renderVideos(data.videos || []);
      console.log(
    "VIDEO COUNT:",
    data.videos ? data.videos.length : "NO VIDEOS ARRAY",
    data.videos
);

        

    } catch (error) {

        console.error(
            "FAILED TO LOAD VIDEOS:",
            error
        );

        showMessage(
            `Unable to load videos.<br><br>${error.message}`
        );
    }
}


/* =========================================
   RENDER VIDEOS
========================================= */

function renderVideos(videos) {

    videoFeed.innerHTML = "";


    const readyVideos =
        videos.filter(function(video) {

            return (
                video.status === "ready" &&
                video.videoUrl
            );

        });


    if (readyVideos.length === 0) {

        showMessage(
            "No ready videos available yet."
        );

        return;
    }


    readyVideos.forEach(
        function(video) {

            const card =
                document.createElement(
                    "article"
                );

            card.className =
                "video-card";


            const videoElement =
                document.createElement(
                    "video"
                );


            videoElement.src =
                video.videoUrl;

            videoElement.autoplay = true;
            videoElement.muted = false;
            videoElement.autoplay = false;
            videoElement.controls = true;
            videoElement.loop = true;
            videoElement.playsInline = true;
            videoElement.setAttribute("webkit-playsinline", "");



            if (video.thumbnailUrl) {

                videoElement.poster =
                    video.thumbnailUrl;
            }


            const info =
                document.createElement(
                    "div"
                );

            info.className =
                "video-info";


            info.innerHTML = `
    <div class="video-creator-header">
        <div class="video-creator-avatar">
            ${
                video.profilePhotoUrl
                    ? `<img src="${video.profilePhotoUrl}" alt="" onerror="this.style.display='none';this.parentElement.classList.add('avatar-fallback');this.parentElement.textContent='${String(video.displayName || video.username || 'U').charAt(0).toUpperCase()}';">`
                    : String(video.displayName || video.username || "U").charAt(0).toUpperCase()
            }
        </div>
        <div class="video-creator-details">
            <div class="video-creator">
                ${video.displayName || "User"}
            </div>
            ${
                video.username
                    ? `<span class="video-username">@${video.username}</span>`
                    : ""
            }
        </div>
    </div>

    <div class="video-caption">
        ${video.caption || ""}
    </div>

    <button
        type="button"
        class="follow-button"
        data-user-id="${video.userId}"
        data-following="false"
    >
        Follow
    <span class="like-count">0</span>
</button>

    <div class="video-actions">
<button
        type="button"
        class="like-button"
        data-video-id="${video.videoId}"
        data-liked="false"
    >
        <span class="action-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></span>
    <span class="like-count">0</span>
</button>

<button
        type="button"
        class="comment-button"
        data-video-id="${video.videoId}"
    >
        <span class="action-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 2 1.3-4.2A7.5 7.5 0 1 1 20 11.5Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg></span>
    
        <span class="comment-count">0</span>
    </button>

<button
        type="button"
        class="repost-button"
        data-video-id="${video.videoId}"
        data-reposted="${video.repostedByMe ? "true" : "false"}"
    >
        <span class="action-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a3 3 0 1 0-2.9-3.8L8.7 7.5a3 3 0 1 0 0 9l6.4 3.3A3 3 0 1 0 16.5 18l-6.4-3.3a3 3 0 0 0 0-3.4l6.4-3.3A3 3 0 0 0 18 8Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
    </button>

<button
        type="button"
        class="save-button"
        data-video-id="${video.videoId}"
        data-saved="false"
    >
        <span class="action-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h12v17L12 16l-6 4.5Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg></span>
    </button>
</div>
`;
async function loadRepostStatus(
    videoId,
    button
) {
    const token = getAccessToken();

    if (!token || !videoId || !button) {
        return;
    }

    try {
        const response = await fetch(
            API_BASE_URL +
            "/v1/videos/" +
            encodeURIComponent(videoId) +
            "/repost",
            {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        if (response.status === 401) {
            return;
        }

        if (!response.ok) {
            throw new Error("Repost status request failed.");
        }

        const data = await response.json();

        button.dataset.reposted =
            data.reposted ? "true" : "false";

        button.dataset.reposted =
            data.reposted ? "true" : "false";
        button.setAttribute(
            "aria-label",
            data.reposted ? "Undo repost" : "Share"
        );
        button.setAttribute(
            "title",
            data.reposted ? "Undo repost" : "Share"
        );

    } catch (error) {
        console.error(
            "REPOST STATUS ERROR:",
            error
        );
    }
}


async function toggleVideoRepost(
    videoId,
    button
) {
    const token = getAccessToken();

    if (!token) {
        showLogin();
        return;
    }

    if (!videoId || !button) {
        return;
    }

    const isReposted =
        button.dataset.reposted === "true";

    button.disabled = true;

    try {
        const response = await fetch(
            API_BASE_URL +
            "/v1/videos/" +
            encodeURIComponent(videoId) +
            "/repost",
            {
                method: isReposted
                    ? "DELETE"
                    : "POST",
                headers: {
                    "Authorization":
                        "Bearer " + token
                }
            }
        );

        if (response.status === 401) {
            clearTokens();
            showLogin();
            return;
        }

        if (!response.ok) {
            throw new Error(
                "Repost request failed."
            );
        }

        button.dataset.reposted =
            isReposted ? "false" : "true";

        button.setAttribute(
            "aria-label",
            isReposted ? "Share" : "Undo repost"
        );
        button.setAttribute(
            "title",
            isReposted ? "Share" : "Undo repost"
        );

    } catch (error) {
        console.error(
            "VIDEO REPOST ERROR:",
            error
        );

        alert(
            "Unable to update repost."
        );
    } finally {
        button.disabled = false;
    }
}


const repostButton =
    info.querySelector(".repost-button");

if (repostButton) {

    repostButton.addEventListener(
        "click",
        function() {
            toggleVideoRepost(
                video.videoId,
                repostButton
            );
        }
    );

    loadRepostStatus(
        video.videoId,
        repostButton
    );
}

const commentButton =
    info.querySelector(".comment-button");

if (commentButton) {

    commentButton.addEventListener(
        "click",
        function() {

                    openComments(
                video.videoId
            );

        }
    );
}

loadVideoCommentCount(video.videoId);

const followButton =
    info.querySelector(".follow-button");

const likeButton =
    info.querySelector(".like-button");

if (likeButton) {

    likeButton.addEventListener(
        "click",
        function() {

            toggleVideoLike(
                video.videoId,
                likeButton
            );

        }
    );

    loadVideoLikeCount(
        video.videoId,
        likeButton
    );
}

if (followButton) {

    followButton.addEventListener(
        "click",
        function() {

            toggleFollow(
                video.userId,
                followButton
            );

        }
    );

    loadFollowStatus(
        video.userId,
        followButton
    );
}

const saveButton =
    info.querySelector(".save-button");

if (saveButton) {

    saveButton.addEventListener(
        "click",
        function() {

            toggleVideoSave(
                video.videoId,
                saveButton
            );

        }
    );

    loadSaveStatus(
        video.videoId,
        saveButton
    );
}

            card.appendChild(
                videoElement
            );


            card.appendChild(
                info
            );

            videoFeed.appendChild(
                card
            );
        }
    );


    setupVideoPlayback();
}


/* =========================================
   VIDEO LIKE / UNLIKE
========================================= */

async function loadVideoLikeCount(videoId, button) {

    if (!videoId || !button) {
        return;
    }

    try {

        const token =
            getAccessToken();

        if (!token) {
            return;
        }

        const response = await fetch(
            API_BASE_URL +
            "/v1/videos/" +
            encodeURIComponent(videoId) +
            "/stats",
            {
                headers: {
                    "Authorization":
                        "Bearer " + token
                }
            }
        );

        if (response.status === 401) {
            clearTokens();
            showLogin();
            return;
        }

        if (!response.ok) {
            return;
        }

        const data =
            await response.json();

        const stats =
            data.stats || {};

        const likeCount =
            typeof stats.likeCount === "number"
                ? stats.likeCount
                : 0;

        const likedByMe =
            stats.likedByMe === true;

        button.dataset.likeCount =
            String(likeCount);

        button.dataset.liked =
            likedByMe
                ? "true"
                : "false";
        const countLabel = button.querySelector(".like-count");
        if (countLabel) {
            countLabel.textContent = String(likeCount);
        }

        button.dataset.liked = likedByMe ? "true" : "false";
        button.setAttribute("aria-label", likedByMe ? "Unlike video" : "Like video");
        button.setAttribute("title", likedByMe ? "Unlike video" : "Like video");

    } catch (error) {

        console.error(
            "LIKE COUNT ERROR:",
            error
        );
    }
}

async function toggleVideoLike(
    videoId,
    button
) {

    const token =
        getAccessToken();

    if (!token) {
        showLogin();
        return;
    }

    if (!videoId || !button) {
        return;
    }

    const isLiked =
        button.dataset.liked === "true";

    button.disabled = true;

    try {

        const response =
            await fetch(
                API_BASE_URL +
                "/v1/videos/" +
                encodeURIComponent(videoId) +
                "/like",
                {
                    method: isLiked
                        ? "DELETE"
                        : "POST",

                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        if (response.status === 401) {

            clearTokens();
            showLogin();
            return;
        }

        if (!response.ok) {
            throw new Error(
                "Like request failed."
            );
        }

        button.dataset.liked =
            isLiked ? "false" : "true";

        await loadVideoLikeCount(
            videoId,
            button
        );

        button.disabled = false;

    } catch (error) {

        console.error(
            "VIDEO LIKE ERROR:",
            error
        );

        button.disabled = false;

        alert(
            "Unable to update video like."
        );
    }
}


/* =========================================
   VIDEO PLAYBACK
========================================= */

function setupVideoPlayback() {

    const videos =
        videoFeed.querySelectorAll(
            "video"
        );


    const observer =
        new IntersectionObserver(
            function(entries) {

                entries.forEach(
                    function(entry) {

                        const video =
                            entry.target;


                        if (
                            entry.isIntersecting
                        ) {

                            video
                                .play()
                                .catch(
                                    function() {}
                                );

                        } else {

                            video.pause();
                        }

                    }
                );

            },
            {
                threshold: 0.7
            }
        );


    videos.forEach(
        function(video) {

            observer.observe(video);

        }
    );
}


/* =========================================
   MESSAGE
========================================= */

function showMessage(message) {

    videoFeed.innerHTML = `
        <div style="
            width:100%;
            height:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            color:white;
            text-align:center;
            padding:30px;
        ">
            ${message}
        </div>
    `;
}


/* =========================================
   PAGE NAVIGATION
========================================= */

function switchPage(pageId) {
    const targetPage = document.getElementById(pageId);

    if (!targetPage) {
        console.error("INTERSTELLAR: Page not found:", pageId);
        return;
    }

    document.querySelectorAll(".page").forEach(function(page) {
        page.classList.toggle("active", page.id === pageId);
    });

    document.querySelectorAll("#bottom-nav button").forEach(function(button) {
        button.classList.toggle("active", button.dataset.page === pageId);
    });

    targetPage.scrollTop = 0;

    if (pageId === "notifications-page") {
        loadNotifications();
    }
}


navButtons.forEach(
    function(button) {

        button.addEventListener(
            "click",
            function() {

                switchPage(
                    button.dataset.page
                );

            }
        );

    }
);



/* DISCOVER NOTIFICATION BELL NAVIGATION */
const topNotificationButton =
    document.querySelector(".top-notification-button");

if (topNotificationButton) {
    topNotificationButton.addEventListener("click", function(event) {
        event.preventDefault();
        event.stopPropagation();
        switchPage("notifications-page");
    });
}


/* =========================================
   NOTIFICATIONS — API CONNECTION
========================================= */

async function loadNotifications() {
    const token = getAccessToken();
    const list = document.getElementById("notifications-list");
    const badge = document.getElementById("notification-count");

    if (!list || !token) return;

    list.textContent = "Loading notifications...";

    try {
        const response = await fetch(
            `${API_BASE_URL}/v1/notifications`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.status === 401) {
            list.textContent = "Please log in again to view notifications.";
            if (badge) badge.style.display = "none";
            return;
        }

        if (!response.ok) throw new Error(`Request failed (${response.status})`);

        const result = await response.json();
        const items = Array.isArray(result.notifications)
            ? result.notifications : [];
        let unreadCount = Number(result.unreadCount) || 0;

        if (badge) {
            badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
            badge.style.display = unreadCount > 0 ? "inline-flex" : "none";
        }

        list.replaceChildren();

        if (items.length === 0) {
            const empty = document.createElement("div");
            empty.className = "notifications-empty";

            const heading = document.createElement("h2");
            heading.textContent = "You're all caught up";

            const description = document.createElement("p");
            description.textContent =
                "Your likes, comments, reposts, and new followers will appear here.";

            empty.append(heading, description);
            list.appendChild(empty);
            return;
        }

        items.forEach(function (item) {
            const card = document.createElement("div");
            card.className = "notification-item" +
                (item.isRead ? "" : " notification-unread");

            const message = document.createElement("p");
            message.textContent = item.message ||
                `${item.actorDisplayName || item.actorUsername || "Someone"} interacted with you.`;

            const time = document.createElement("small");
            const date = item.createdAt ? new Date(item.createdAt) : null;
            time.textContent = date && !Number.isNaN(date.getTime())
                ? date.toLocaleString() : "";

            const status = document.createElement("span");
            status.className = "notification-status" +
                (item.isRead ? " status-read" : " status-unread");
            status.textContent = item.isRead ? "✓ Read" : "● Unread";

            card.append(message, time, status);

            if (item.notificationId) {
                card.style.cursor = "pointer";
                card.addEventListener("click", async function () {
                    try {
                        const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 8000);

let marked;

try {
    marked = await fetch(
        `${API_BASE_URL}/v1/notifications/${encodeURIComponent(item.notificationId)}/read`,
        {
            method: "PATCH",
            headers: { Authorization: `Bearer ${getAccessToken()}` },
            signal: controller.signal
        }
    );

    if (marked.status === 401) {
        await refreshAccessToken();
        marked = await fetch(
            `${API_BASE_URL}/v1/notifications/${encodeURIComponent(item.notificationId)}/read`,
            {
                method: "PATCH",
                headers: { Authorization: `Bearer ${getAccessToken()}` }
            }
        );
    }
} finally {
    clearTimeout(timeout);
}
                        if (!marked.ok) {
                            const details = await marked.text();
                            alert("Mark as read failed (" + marked.status + "): " + details);
                            throw new Error("Mark as read failed (" + marked.status + ")");
                        }
                        item.isRead = true;
                        status.textContent = "✓ Read";
                        status.className = "notification-status status-read";
                        card.classList.remove("notification-unread");
card.classList.add("notification-read");
                      card.style.setProperty("background", "#111019", "important");
card.style.setProperty("background-color", "#111019", "important");
card.style.setProperty("border-color", "#392653", "important");
card.style.setProperty("box-shadow", "none", "important");
                        unreadCount = Math.max(0, unreadCount - 1);

                        if (badge) {
                            badge.textContent = unreadCount > 99
                                ? "99+" : String(unreadCount);
                            badge.style.display = unreadCount > 0
                                ? "inline-flex" : "none";
                        }
} catch (error) {
    alert("Notification error: " + error.message);
    console.error("Could not mark notification as read:", error);
                    }
                });
            }

            list.appendChild(card);
        });
    } catch (error) {
        console.error("Could not load notifications:", error);
        list.textContent =
            "Notifications could not be loaded. Check your connection and try again.";
    }
}

const notificationsNavButton =
    document.querySelector('#bottom-nav button[data-page="notifications-page"]');

if (notificationsNavButton) {
    notificationsNavButton.addEventListener("click", function() {
        switchPage("notifications-page");
    });
}


/* =========================================
   PROFILE SYSTEM
========================================= */

async function loadProfile() {

    const token = getAccessToken();

    if (!token) {
        return;
    }

    const message =
        document.getElementById("profile-message");

    try {

        if (message) {
            message.textContent =
                "Loading profile...";
        }

        const response = await fetch(
            API_BASE_URL + "/v1/profile",
            {
                headers: {
                    Authorization:
                        "Bearer " + token
                }
            }
        );

        if (response.status === 401) {

            clearTokens();
            showLogin();
            return;

        }

        if (!response.ok) {
            throw new Error(
                "Failed to load profile"
            );
        }

        const profileResponse =
            await response.json();

        const profile =
            profileResponse.user;

        if (!profile) {
            throw new Error("Invalid profile response");
        }

        const displayName =
            document.getElementById(
                "profile-display-name"
            );

        const username =
            document.getElementById(
                "profile-username"
            );

        const bio =
            document.getElementById(
                "profile-bio"
            );

        const followers =
            document.getElementById(
                "profile-followers-count"
            );

        const following =
            document.getElementById(
                "profile-following-count"
            );

        const photo =
            document.getElementById(
                "profile-photo"
            );

        const placeholder =
            document.getElementById(
                "profile-photo-placeholder"
            );


        if (displayName) {

            displayName.textContent =
                profile.displayName || "User";

        }


        if (username) {

            username.textContent =
                profile.username
                    ? "@" + profile.username
                    : "@username";

        }


        if (bio) {

            bio.textContent =
                profile.bio || "No bio yet.";

        }


        if (followers) {

            followers.textContent =
                Number(
                    profileResponse.followersCount || 0
                );

        }


        if (following) {

            following.textContent =
                Number(
                    profileResponse.followingCount || 0
                );

        }


        if (photo && placeholder) {

            if (profile.profilePhotoUrl) {

                photo.src =
                    profile.profilePhotoUrl;

                photo.style.display =
                    "block";

                placeholder.style.display =
                    "none";

            } else {

                photo.style.display =
                    "none";

                placeholder.style.display =
                    "flex";

            }

        }


        await loadProfileVideos();


        if (message) {
            message.textContent = "";
        }

    } catch (error) {

        console.error(
            "PROFILE LOAD ERROR:",
            error
        );

        if (message) {

            message.textContent =
                "Unable to load profile.";

        }

    }

}


async function loadProfileVideos() {

    const token = getAccessToken();

    const container =
        document.getElementById(
            "profile-videos"
        );

    const count =
        document.getElementById(
            "profile-video-count"
        );

    if (!container || !token) {
        return;
    }


    try {

        const response = await fetch(
            API_BASE_URL +
                "/v1/profile/videos",
            {
                headers: {
                    Authorization:
                        "Bearer " + token
                }
            }
        );


        if (response.status === 401) {

            clearTokens();
            showLogin();
            return;

        }


        if (!response.ok) {

            throw new Error(
                "Failed to load videos"
            );

        }


        const videosResponse =
            await response.json();

        const videos =
            videosResponse.videos || [];

        container.innerHTML = "";


        if (count) {

            count.textContent =
                videos.length;

        }


        if (!videos.length) {

            container.innerHTML =
                '<div class="profile-video-empty">No videos yet.</div>';

            return;

        }


        videos.forEach(function(video) {
            const item = document.createElement("div");
            item.className = "profile-video-item";
            item.style.cursor = "pointer";
            item.style.position = "relative";

            if (video.thumbnailUrl) {
                const image = document.createElement("img");
                image.src = video.thumbnailUrl;
                image.alt = video.caption || "Video";
                item.appendChild(image);
            } else {
                const preview = document.createElement("video");
                preview.src = video.videoUrl;
                preview.muted = true;
                preview.playsInline = true;
                preview.preload = "metadata";
                preview.style.pointerEvents = "none";
                item.appendChild(preview);
            }

            const viewBadge = document.createElement("span");
            viewBadge.textContent =
                "\u25c9 " + Number(video.viewCount || 0) + " views";
            viewBadge.style.position = "absolute";
            viewBadge.style.left = "5px";
            viewBadge.style.bottom = "5px";
            viewBadge.style.padding = "4px 6px";
            viewBadge.style.background = "rgba(0,0,0,0.75)";
            viewBadge.style.color = "#fff";
            viewBadge.style.fontSize = "11px";
            viewBadge.style.borderRadius = "5px";
            viewBadge.style.pointerEvents = "none";
            item.appendChild(viewBadge);

            item.setAttribute("role", "button");
            item.setAttribute("tabindex", "0");
            item.setAttribute("aria-label",
                "Watch video. " + Number(video.viewCount || 0) + " views");

            async function openProfileVideo() {
                if (!video.videoUrl || !video.videoId) {
                    console.error("Profile video URL or ID is missing:", video);
                    return;
                }

                if (document.getElementById("profile-video-viewer")) {
                    return;
                }

                const overlay = document.createElement("div");
                overlay.id = "profile-video-viewer";
                overlay.style.cssText =
                    "position:fixed;inset:0;z-index:99999;" +
                    "background:rgba(0,0,0,.94);display:flex;" +
                    "align-items:center;justify-content:center;padding:16px;";

                const playerBox = document.createElement("div");
                playerBox.style.cssText =
                    "position:relative;width:100%;max-width:500px;" +
                    "max-height:90vh;display:flex;flex-direction:column;" +
                    "align-items:center;gap:10px;";

                const closeButton = document.createElement("button");
                closeButton.type = "button";
                closeButton.textContent = "\u2715 Close";
                closeButton.style.cssText =
                    "align-self:flex-end;padding:10px 14px;" +
                    "border:0;border-radius:8px;background:#292929;" +
                    "color:white;font-size:14px;";

                const player = document.createElement("video");
                player.preload = "auto";
                player.src = video.videoUrl;
                player.controls = true;
                player.autoplay = true;
                player.playsInline = true;
                player.setAttribute("playsinline", "");
                player.setAttribute("webkit-playsinline", "");
                player.style.cssText =
                    "width:100%;max-height:78vh;background:#000;" +
                    "object-fit:contain;border-radius:10px;";

                const actions = document.createElement("div");
                actions.style.cssText =
                    "display:flex;justify-content:space-around;" +
                    "align-items:center;gap:12px;width:100%;flex-wrap:wrap;";

                function makeActionButton(label, action) {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.textContent = label;
                    button.style.cssText =
                        "padding:10px 12px;border:1px solid #555;" +
                        "border-radius:10px;background:#222;color:white;" +
                        "font-size:14px;cursor:pointer;";
                    button.addEventListener("click", function(event) {
                        event.stopPropagation();
                        action(button);
                    });
                    actions.appendChild(button);
                    return button;
                }

                const likeButton = makeActionButton("♡ Like", function(button) {
                    toggleVideoLike(video.videoId, button);
                });
                likeButton.dataset.liked = "false";

                const commentButton = makeActionButton("💬 Comment", function() {
                    closeViewer();
                    openComments(video.videoId);
                });

                const repostButton = makeActionButton("↗ Share", function(button) {
                    toggleVideoRepost(video.videoId, button);
                });
                repostButton.dataset.reposted = "false";

                const saveButton = makeActionButton("☆ Save", function(button) {
                    toggleVideoSave(video.videoId, button);
                });
                saveButton.dataset.saved = "false";

                loadVideoLikeCount(video.videoId, likeButton);
                loadRepostStatus(video.videoId, repostButton);
                loadSaveStatus(video.videoId, saveButton);

                const caption = document.createElement("div");
                caption.textContent = video.caption || "INTERSTELLAR video";
                caption.style.cssText =
                    "color:white;font-size:14px;align-self:flex-start;";

                function closeViewer() {
                    player.pause();
                    player.removeAttribute("src");
                    player.load();
                    overlay.remove();
                }

                closeButton.addEventListener("click", closeViewer);
                overlay.addEventListener("click", function(event) {
                    if (event.target === overlay) closeViewer();
                });
                player.addEventListener("click", function(event) {
                    event.stopPropagation();
                });

                playerBox.appendChild(closeButton);
                playerBox.appendChild(player);
                playerBox.appendChild(actions);
                playerBox.appendChild(caption);
                overlay.appendChild(playerBox);
                document.body.appendChild(overlay);

                const token = getAccessToken();

                if (token) {
                    try {
                        const response = await fetch(
                            API_BASE_URL + "/v1/videos/" +
                                encodeURIComponent(video.videoId) + "/views",
                            {
                                method: "POST",
                                headers: {
                                    Authorization: "Bearer " + token
                                }
                            }
                        );

                        if (response.ok) {
                            const result = await response.json();
                            if (typeof result.viewCount === "number") {
                                video.viewCount = result.viewCount;
                                viewBadge.textContent =
                                    "\u25c9 " + result.viewCount + " views";
                                item.setAttribute("aria-label",
                                    "Watch video. " + result.viewCount + " views");
                            }
                        } else {
                            console.error("Could not record video view:", response.status);
                        }
                    } catch (error) {
                        console.error("VIDEO VIEW ERROR:", error);
                    }
                }
            }

            item.addEventListener("click", openProfileVideo);
            item.addEventListener("keydown", function(event) {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openProfileVideo();
                }
            });

            container.appendChild(item);
        });

    } catch (error) {

        console.error(
            "PROFILE VIDEOS ERROR:",
            error
        );

        container.innerHTML =
            '<div class="profile-video-empty">Unable to load videos.</div>';

    }

}



/* =========================================
   EDIT PROFILE SYSTEM
========================================= */

const editProfileButton =
    document.getElementById(
        "edit-profile-button"
    );

const editProfileForm =
    document.getElementById(
        "edit-profile-form"
    );

const editDisplayName =
    document.getElementById(
        "edit-display-name"
    );

const editBio =
    document.getElementById(
        "edit-bio"
    );

const editProfilePhotoUrl =
    document.getElementById(
        "edit-profile-photo-url"
    );

/* PROFILE PHOTO PICKER */
const editProfilePhotoFile =
    document.getElementById("edit-profile-photo-file");

/* STRONG PROFILE PHOTO TAP FIX */
const profilePhotoImage = document.getElementById("profile-photo");
const profilePhotoPlaceholder = document.getElementById("profile-photo-placeholder");
const profilePhotoWrapper = document.querySelector(".profile-photo-wrapper");


/* Independent profile photo picker: keep Edit Profile closed */
(function () {
    const directPicker = document.getElementById("profile-photo-direct-file");
    const existingPicker = document.getElementById("edit-profile-photo-file");

    if (!directPicker) return;

    directPicker.addEventListener("click", function (event) {
        event.stopPropagation();
    });

    directPicker.addEventListener("change", function () {
        const file = directPicker.files && directPicker.files[0];
        if (!file) return;

        saveProfilePhotoOnly(file);

        if (existingPicker) {
            try {
                const transfer = new DataTransfer();
                transfer.items.add(file);
                existingPicker.files = transfer.files;
                existingPicker.dispatchEvent(new Event("change", { bubbles: true }));
            } catch (error) {
                console.error("Could not connect profile photo to preview:", error);
            }
        }
    });
})();

function openProfilePhotoPicker() {
    const directPicker = document.getElementById("profile-photo-direct-file");
    if (!directPicker) {
        console.error("Independent profile photo picker not found.");
        return;
    }

    directPicker.disabled = false;
    directPicker.removeAttribute("disabled");

    /* Use the independent picker, not the Edit Profile input */
    directPicker.click();
}

[profilePhotoWrapper, profilePhotoImage, profilePhotoPlaceholder].forEach(function (element) {
    if (!element) return;
    element.style.cursor = "pointer";
    element.style.pointerEvents = "auto";
    element.addEventListener("click", openProfilePhotoPicker);
});

/* Keep file selection directly user-triggered */
if (editProfilePhotoFile) {
    editProfilePhotoFile.disabled = false;
    editProfilePhotoFile.removeAttribute("disabled");
    editProfilePhotoFile.style.display = "block";
    editProfilePhotoFile.style.visibility = "visible";
    editProfilePhotoFile.style.opacity = "1";
    editProfilePhotoFile.style.pointerEvents = "auto";
}
const editProfilePhotoPreview =
    document.getElementById("edit-profile-photo-preview");

if (editProfilePhotoFile && editProfilePhotoPreview) {
    editProfilePhotoFile.addEventListener("change", function () {
        const file = editProfilePhotoFile.files &&
            editProfilePhotoFile.files[0];

        if (!file) {
            editProfilePhotoPreview.hidden = true;
            editProfilePhotoPreview.removeAttribute("src");
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            editProfilePhotoFile.value = "";
            editProfilePhotoPreview.hidden = true;

            if (editProfileMessage) {
                editProfileMessage.textContent =
                    "Choose a JPG, PNG, or WebP image.";
            }
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            editProfilePhotoFile.value = "";
            editProfilePhotoPreview.hidden = true;

            if (editProfileMessage) {
                editProfileMessage.textContent =
                    "Choose an image smaller than 5 MB.";
            }
            return;
        }

        editProfilePhotoPreview.src = URL.createObjectURL(file);

          if (profilePhotoImage) {
              profilePhotoImage.src = editProfilePhotoPreview.src;
              profilePhotoImage.style.display = "block";
          }

          if (profilePhotoPlaceholder) {
              profilePhotoPlaceholder.style.display = "none";
          }
        editProfilePhotoPreview.hidden = false;

        if (editProfileMessage) {
            editProfileMessage.textContent = "Photo selected.";
        }
    });
}


const cancelEditProfileButton =
    document.getElementById(
        "cancel-edit-profile-button"
    );


function openEditProfile() {

    const displayName =
        document.getElementById(
            "profile-display-name"
        );

    const bio =
        document.getElementById(
            "profile-bio"
        );

    const photo =
        document.getElementById(
            "profile-photo"
        );


    if (editDisplayName) {

        editDisplayName.value =
            displayName
                ? displayName.textContent.trim()
                : "";

    }


    if (editBio) {

        const currentBio =
            bio
                ? bio.textContent.trim()
                : "";

        editBio.value =
            currentBio === "No bio yet."
                ? ""
                : currentBio;

    }


    if (editProfilePhotoUrl) {

        editProfilePhotoUrl.value =
            photo &&
            photo.style.display !== "none"
                ? photo.src
                : "";

    }


    if (editProfileForm) {

        editProfileForm.hidden = false;

        editProfileForm.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

}


function closeEditProfile() {

    if (editProfileForm) {

        editProfileForm.hidden = true;

    }

}


if (editProfileButton) {

    editProfileButton.addEventListener(
        "click",
        openEditProfile
    );

}


if (cancelEditProfileButton) {

    cancelEditProfileButton.addEventListener(
        "click",
        closeEditProfile
    );

}



/* =========================================
   SAVE PROFILE CHANGES
========================================= */

const saveProfileButton =
    document.getElementById(
        "save-profile-button"
    );

const editProfileMessage =
    document.getElementById(
        "edit-profile-message"
    );


async function saveProfileChanges() {

    const token = getAccessToken();

    if (!token) {
        return;
    }


    const displayName =
        editDisplayName
            ? editDisplayName.value.trim()
            : "";

    const bio =
        editBio
            ? editBio.value.trim()
            : "";

    let profilePhotoUrl =
        editProfilePhotoUrl
            ? editProfilePhotoUrl.value.trim()
            : "";


    if (!displayName) {

        if (editProfileMessage) {

            editProfileMessage.textContent =
                "Display name is required.";

        }

        return;

    }


    if (displayName.length > 100) {

        if (editProfileMessage) {

            editProfileMessage.textContent =
                "Display name is too long.";

        }

        return;

    }


    if (bio.length > 500) {

        if (editProfileMessage) {

            editProfileMessage.textContent =
                "Bio must be 500 characters or less.";

        }

        return;

    }


    try {

        if (editProfileMessage) {

            editProfileMessage.textContent =
                "Saving...";

        }


        if (saveProfileButton) {

            saveProfileButton.disabled =
                true;

        }


        const selectedPhoto =
            editProfilePhotoFile && editProfilePhotoFile.files
                ? editProfilePhotoFile.files[0]
                : null;

        if (selectedPhoto) {
            if (selectedPhoto.size > 5 * 1024 * 1024) {
                throw new Error("Choose an image smaller than 5 MB.");
            }

            if (!["image/jpeg", "image/png", "image/webp"].includes(selectedPhoto.type)) {
                throw new Error("Choose a JPG, PNG, or WebP image.");
            }

            if (editProfileMessage) {
                editProfileMessage.textContent = "Preparing photo upload...";
            }

            const urlResponse = await fetch(
                API_BASE_URL + "/v1/profile/photo-upload-url",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + token
                    },
                    body: JSON.stringify({
                        content_type: selectedPhoto.type
                    })
                }
            );

            const uploadInfo = await urlResponse.json();

            if (!urlResponse.ok) {
                throw new Error(
                    uploadInfo?.error?.message ||
                    "Could not prepare photo upload."
                );
            }

            if (!uploadInfo.upload?.url || !uploadInfo.profile_photo_url) {
                throw new Error("The server returned incomplete upload details.");
            }

            if (editProfileMessage) {
                editProfileMessage.textContent = "Uploading photo...";
            }

            const photoResponse = await fetch(uploadInfo.upload.url, {
                method: uploadInfo.upload.method || "PUT",
                headers: {
                    "Content-Type": selectedPhoto.type
                },
                body: selectedPhoto
            });

            if (!photoResponse.ok) {
                throw new Error(
                    "Photo upload failed (" + photoResponse.status + ")."
                );
            }

            profilePhotoUrl = uploadInfo.profile_photo_url;

            if (editProfilePhotoUrl) {
                editProfilePhotoUrl.value = profilePhotoUrl;
            }
        }

        const response = await fetch(
            API_BASE_URL + "/v1/profile",
            {
                method: "PATCH",

                headers: {
                    "Content-Type":
                        "application/json",

                    Authorization:
                        "Bearer " + token
                },

                body: JSON.stringify({

                    display_name:
                        displayName,

                    bio:
                        bio || null,

                    profile_photo_url:
                        profilePhotoUrl || null

                })
            }
        );


        if (response.status === 401) {

            clearTokens();
            showLogin();
            return;

        }


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result?.error?.message ||
                result?.message ||
                "Unable to update profile"
            );

        }


        if (editProfileMessage) {

            editProfileMessage.textContent =
                "Profile updated.";

        }


        setTimeout(
            function() {

                closeEditProfile();

            },
            700
        );


    } catch (error) {

        console.error(
            "SAVE PROFILE ERROR:",
            error
        );


        if (editProfileMessage) {

            editProfileMessage.textContent =
                error.message ||
                "Unable to save profile.";

        }

    } finally {

        if (saveProfileButton) {

            saveProfileButton.disabled =
                false;

        }

    }

}


if (saveProfileButton) {

    saveProfileButton.addEventListener(
        "click",
        saveProfileChanges
    );

}



/* Save a profile photo without opening Edit Profile */
async function saveProfilePhotoOnly(file) {
    const token = getAccessToken();

    if (!token) {
        alert("Please log in again before saving your profile photo.");
        return;
    }

    if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        alert("Choose a JPG, PNG, or WebP image.");
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert("Choose an image smaller than 5 MB.");
        return;
    }

    try {
        const photoTimingStart = performance.now();
        let photoTimingLast = photoTimingStart;
        function photoTiming(label) {
            const now = performance.now();
            console.log(
                "PHOTO TIMING: " + label +
                " = " + ((now - photoTimingLast) / 1000).toFixed(2) +
                "s; total " + ((now - photoTimingStart) / 1000).toFixed(2) + "s"
            );
            photoTimingLast = now;
        }
        console.log("PHOTO TIMING: original size = " + (file.size / 1024).toFixed(1) + " KB");

        let uploadFile = file;

        /* Resize and compress before uploading */
        if (typeof createImageBitmap === "function") {
            const bitmap = await createImageBitmap(file);
            const maxDimension = 1280;
            const scale = Math.min(
                1,
                maxDimension / Math.max(bitmap.width, bitmap.height)
            );

            if (scale < 1 || file.size > 400 * 1024) {
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(bitmap.width * scale));
                canvas.height = Math.max(1, Math.round(bitmap.height * scale));

                const context = canvas.getContext("2d");
                if (!context) {
                    bitmap.close();
                    throw new Error("Could not prepare the photo for upload.");
                }

                context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
                bitmap.close();

                const compressedBlob = await new Promise((resolve, reject) => {
                    canvas.toBlob(
                        blob => blob ? resolve(blob) : reject(
                            new Error("Photo compression failed.")
                        ),
                        "image/jpeg",
                        0.78
                    );
                });

                if (compressedBlob.size < file.size) {
                    uploadFile = new File(
                        [compressedBlob],
                        "profile-photo.jpg",
                        { type: "image/jpeg" }
                    );
                }
            } else {
                bitmap.close();
            }
        }

        photoTiming('compression complete; upload size ' + (uploadFile.size / 1024).toFixed(1) + ' KB');

        const urlResponse = await fetch(
            API_BASE_URL + "/v1/profile/photo-upload-url",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + token
                },
                body: JSON.stringify({ content_type: uploadFile.type })
            }
        );

        const uploadInfo = await urlResponse.json();
        photoTiming('upload link ready');

        if (!urlResponse.ok || !uploadInfo.upload?.url || !uploadInfo.profile_photo_url) {
            throw new Error(
                uploadInfo?.error?.message || "Could not prepare photo upload."
            );
        }

        const uploadResponse = await fetch(uploadInfo.upload.url, {
            method: uploadInfo.upload.method || "PUT",
            headers: { "Content-Type": uploadFile.type },
            body: uploadFile
        });

        photoTiming('storage upload complete');

        if (!uploadResponse.ok) {
            throw new Error("Photo upload failed (" + uploadResponse.status + ").");
        }

        const profileResponse = await fetch(API_BASE_URL + "/v1/profile", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
            },
            body: JSON.stringify({
                profile_photo_url: uploadInfo.profile_photo_url
            })
        });

        const result = await profileResponse.json();
        photoTiming('profile save complete');

        if (!profileResponse.ok) {
            throw new Error(
                result?.error?.message ||
                result?.message ||
                "Could not save profile photo."
            );
        }

        if (profilePhotoImage) {
            profilePhotoImage.src = uploadInfo.profile_photo_url;
            profilePhotoImage.style.display = "block";
        }

        if (profilePhotoPlaceholder) {
            profilePhotoPlaceholder.style.display = "none";
        }

        alert("Profile photo saved successfully.");
    } catch (error) {
        console.error("Profile photo save failed:", error);
        alert(error?.message || "Unable to save profile photo.");
    }
}

/* PROFILE NAVIGATION */

const originalSwitchPage =
    switchPage;

switchPage = function(pageId) {

    originalSwitchPage(pageId);

    if (pageId === "profile-page") {

        loadProfile();

    }

};


/* =========================================
   START APPLICATION
========================================= */

if (getAccessToken()) {

    showApplication();

    switchPage("home-page");

    loadVideos();

} else {

    showSignup();
}
/* =========================================
   INTERSTELLAR — FOLLOW / UNFOLLOW
========================================= */

async function loadFollowStatus(userId, button) {

    if (!userId || !button) {
        return;
    }

    try {

        const token =
            getAccessToken();

        if (!token) {
            return;
        }

        const response = await fetch(
            API_BASE_URL +
            "/v1/users/" +
            encodeURIComponent(userId) +
            "/follow",
            {
                headers: {
                    "Authorization":
                        "Bearer " + token
                }
            }
        );

        if (response.status === 401) {
            clearTokens();
            showLogin();
            return;
        }

        if (!response.ok) {
            return;
        }

        const data =
            await response.json();

        const following =
            data.following === true;

        button.dataset.following =
            following
                ? "true"
                : "false";

        button.textContent =
            following
                ? "Following"
                : "Follow";

    } catch (error) {

        console.error(
            "FOLLOW STATUS ERROR:",
            error
        );
    }
}



async function deleteComment(commentId, videoId) {

    if (!commentId || !videoId) {
        return;
    }

    const token = getAccessToken();

    if (!token) {
        showLogin();
        return;
    }

    if (!confirm("Delete this comment?")) {
        return;
    }

    try {

        const response = await fetch(
            API_BASE_URL +
            "/v1/comments/" +
            encodeURIComponent(commentId),
            {
                method: "DELETE",
                headers: {
                    "Authorization":
                        "Bearer " + token
                }
            }
        );

        if (response.status === 401) {
            clearTokens();
            showLogin();
            return;
        }

        if (!response.ok) {
            throw new Error(
                "Unable to delete comment."
            );
        }

        await loadComments(videoId);

    } catch (error) {

        console.error(
            "DELETE COMMENT ERROR:",
            error
        );

        alert(
            "Unable to delete comment."
        );
    }
}


async function createComment(videoId) {

    const input =
        document.getElementById(
            "comment-input"
        );

    if (!input || !videoId) {
        return;
    }

    const commentText =
        input.value.trim();

    if (!commentText) {
        return;
    }

    const token =
        getAccessToken();

    if (!token) {
        showLogin();
        return;
    }

    try {

        const response = await fetch(
            API_BASE_URL +
            "/v1/videos/" +
            encodeURIComponent(videoId) +
            "/comments",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        "Bearer " + token
                },

                body: JSON.stringify({
                    comment_text:
                        commentText
                })
            }
        );

        if (response.status === 401) {
            clearTokens();
            showLogin();
            return;
        }

        if (!response.ok) {
            throw new Error(
                "Unable to create comment."
            );
        }

        input.value = "";

        await loadComments(videoId);

    } catch (error) {

        console.error(
            "CREATE COMMENT ERROR:",
            error
        );

        alert(
            "Unable to post comment."
        );
    }
}



function updateCommentCount(videoId, count) {
    document.querySelectorAll(".comment-button").forEach(function(button) {
        if (button.dataset.videoId !== String(videoId)) return;
        const label = button.querySelector(".comment-count");
        if (label) label.textContent = String(count);
    });
}

async function loadVideoCommentCount(videoId) {
    const token = getAccessToken();
    if (!token || !videoId) return;

    try {
        const response = await fetch(
            API_BASE_URL + "/v1/videos/" +
            encodeURIComponent(videoId) + "/comments",
            { headers: { "Authorization": "Bearer " + token } }
        );
        if (!response.ok) return;

        const data = await response.json();
        const items = Array.isArray(data.items) ? data.items : [];
        updateCommentCount(videoId, items.length);
    } catch (error) {
        console.error("COMMENT COUNT ERROR:", error);
    }
}

async function loadComments(videoId) {

    const panel =
        document.getElementById(
            "comments-panel"
        );

    const list =
        document.getElementById(
            "comments-list"
        );

    if (!panel || !list || !videoId) {
        return;
    }

    const token =
        getAccessToken();

    if (!token) {
        showLogin();
        return;
    }

    try {

        const response = await fetch(
            API_BASE_URL +
            "/v1/videos/" +
            encodeURIComponent(videoId) +
            "/comments",
            {
                headers: {
                    "Authorization":
                        "Bearer " + token
                }
            }
        );

        if (response.status === 401) {
            clearTokens();
            showLogin();
            return;
        }

        if (!response.ok) {
            throw new Error(
                "Unable to load comments."
            );
        }

        const data =
            await response.json();

        const items =
            Array.isArray(data.items)
                ? data.items
                : [];

        list.innerHTML = "";

        if (items.length === 0) {

            const empty =
                document.createElement(
                    "div"
                );

            empty.className =
                "no-comments";

            empty.textContent =
                "No comments yet.";

            list.appendChild(empty);

            return;
        }

        items.forEach(
            function(comment) {

                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "comment-item";

                const text =
                    document.createElement(
                        "div"
                    );

                text.className =
                    "comment-text";

                text.textContent =
                    comment.commentText || "";

                item.appendChild(text);

                const date =
                    document.createElement(
                        "div"
                    );

                date.className =
                    "comment-date";

                date.textContent =
                    comment.createdAt
                        ? new Date(
                            comment.createdAt
                        ).toLocaleString()
                        : "";

                item.appendChild(date);

                if (
                    comment.userId ===
                    getCurrentUserId()
                ) {

                    const deleteButton =
                        document.createElement(
                            "button"
                        );

                    deleteButton.type =
                        "button";

                    deleteButton.className =
                        "delete-comment-button";

                    deleteButton.textContent =
                        "Delete";

                    deleteButton.addEventListener(
                        "click",
                        function(event) {

                            event.preventDefault();
                            event.stopPropagation();

                            deleteComment(
                                comment.commentId,
                                videoId
                            );

                        }
                    );

                    item.appendChild(
                        deleteButton
                    );
                }

                list.appendChild(item);
            }
        );

    } catch (error) {

        console.error(
            "LOAD COMMENTS ERROR:",
            error
        );

        list.innerHTML = "";

        const errorMessage =
            document.createElement(
                "div"
            );

        errorMessage.className =
            "no-comments";

        errorMessage.textContent =
            "Unable to load comments.";

        list.appendChild(
            errorMessage
        );
    }
}


async function openComments(videoId) {

    if (!videoId) {
        return;
    }

    const existing =
        document.getElementById(
            "comments-panel"
        );

    if (existing) {
        existing.remove();
    }

    const panel =
        document.createElement(
            "div"
        );

    panel.id =
        "comments-panel";

    const overlay =
        document.createElement(
            "div"
        );

    overlay.className =
        "comments-overlay";

    const box =
        document.createElement(
            "div"
        );

    box.className =
        "comments-box";

    const header =
        document.createElement(
            "div"
        );

    header.className =
        "comments-header";

    const title =
        document.createElement(
            "strong"
        );

    title.textContent =
        "Comments";

    const closeButton =
        document.createElement(
            "button"
        );

    closeButton.type =
        "button";

    closeButton.className =
        "comments-close";

    closeButton.textContent =
        "×";

    header.appendChild(title);
    header.appendChild(closeButton);

    const list =
        document.createElement(
            "div"
        );

    list.id =
        "comments-list";

    list.className =
        "comments-list";

    list.textContent =
        "Loading comments...";

    const form =
        document.createElement(
            "form"
        );

    form.id =
        "comment-form";

    form.className =
        "comment-form";

    const input =
        document.createElement(
            "input"
        );

    input.id =
        "comment-input";

    input.type =
        "text";

    input.maxLength =
        1000;

    input.placeholder =
        "Write a comment...";

    input.autocomplete =
        "off";

    const sendButton =
        document.createElement(
            "button"
        );

    sendButton.type =
        "submit";

    sendButton.textContent =
        "Send";

    form.appendChild(input);
    form.appendChild(sendButton);

    box.appendChild(header);
    box.appendChild(list);
    box.appendChild(form);

    panel.appendChild(overlay);
    panel.appendChild(box);

    document.body.appendChild(panel);

    closeButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();
            event.stopPropagation();

            panel.remove();

        }
    );

    overlay.addEventListener(
        "click",
        function(event) {

            event.preventDefault();
            event.stopPropagation();

            panel.remove();

        }
    );

    form.addEventListener(
        "submit",
        function(event) {

            event.preventDefault();
            event.stopPropagation();

            createComment(videoId);

        }
    );

    input.focus();

    loadComments(videoId).catch(
        function(error) {

            console.error(
                "COMMENTS LOAD ERROR:",
                error
            );

        }
    );
}

async function toggleVideoSave(videoId, button) {

    const token =
        getAccessToken();

    if (!token) {
        showLogin();
        return;
    }

    if (!videoId || !button) {
        return;
    }

    const isSaved =
        button.dataset.saved === "true";

    button.disabled = true;

    try {

        const response =
            await fetch(
                API_BASE_URL +
                "/v1/videos/" +
                encodeURIComponent(videoId) +
                "/save",
                {
                    method: isSaved
                        ? "DELETE"
                        : "POST",

                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        if (response.status === 401) {

            clearTokens();
            showLogin();
            return;
        }

        if (!response.ok) {
            throw new Error(
                "Save request failed."
            );
        }

        button.dataset.saved =
            isSaved
                ? "false"
                : "true";

        button.textContent =
            isSaved
                ? "☆ Save"
                : "★ Saved";

        button.disabled = false;

    } catch (error) {

        console.error(
            "VIDEO SAVE ERROR:",
            error
        );

        button.disabled = false;

        alert(
            "Unable to update saved video."
        );
    }
}


async function loadSaveStatus(videoId, button) {

    if (!videoId || !button) {
        return;
    }

    try {

        const token =
            getAccessToken();

        if (!token) {
            return;
        }

        const response =
            await fetch(
                API_BASE_URL +
                "/v1/videos/" +
                encodeURIComponent(videoId) +
                "/save",
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        if (response.status === 401) {
            clearTokens();
            showLogin();
            return;
        }

        if (!response.ok) {
            return;
        }

        const data =
            await response.json();

        const saved =
            data.saved === true;

        button.dataset.saved =
            saved
                ? "true"
                : "false";

        button.textContent =
            saved
                ? "★ Saved"
                : "☆ Save";

    } catch (error) {

        console.error(
            "SAVE STATUS ERROR:",
            error
        );
    }
}


async function toggleFollow(userId, button) {

    const token = getAccessToken();

    if (!token) {
        showLogin();
        return;
    }

    if (!userId || !button) {
        return;
    }

    const isFollowing =
        button.dataset.following === "true";

    button.disabled = true;

    try {

        const response = await fetch(
            API_BASE_URL +
            "/v1/users/" +
            encodeURIComponent(userId) +
            "/follow",
            {
                method: isFollowing
                    ? "DELETE"
                    : "POST",

                headers: {
                    "Authorization":
                        "Bearer " + token
                }
            }
        );

        if (response.status === 401) {
            clearTokens();
            showLogin();
            return;
        }

        if (!response.ok) {
            throw new Error(
                "Follow request failed."
            );
        }

        button.dataset.following =
            isFollowing ? "false" : "true";

        button.textContent =
            isFollowing
                ? "Follow"
                : "Following";

        button.disabled = false;

    } catch (error) {

        console.error(
            "FOLLOW ERROR:",
            error
        );

        button.disabled = false;

        alert(
            "Unable to update follow status."
        );
    }
}
/* =========================================
   INTERSTELLAR — VIDEO LIKE / UNLIKE
========================================= */

/* =========================================
   INTERSTELLAR — LOAD VIDEO LIKE COUNT
========================================= */


/* =========================================
   INTERSTELLAR — SPLASH SCREEN
========================================= */

window.addEventListener("load", function () {

    const splash =
        document.getElementById(
            "interstellar-splash"
        );

    if (!splash) {
        return;
    }

    setTimeout(function () {

        splash.classList.add("hidden");

        setTimeout(function () {

            if (splash.parentNode) {
                splash.parentNode.removeChild(
                    splash
                );
            }

        }, 700);

    }, 2500);

});

/* =========================================
   INTERSTELLAR — NEW STORY UI CONTROLLER
========================================= */

(function () {

    const storyList =
        document.getElementById("interstellar-story-list");

    if (!storyList) {
        return;
    }

    const sampleStories = [
        {
            name: "Interstellar",
            letter: "I"
        },
        {
            name: "Football",
            letter: "F"
        },
        {
            name: "Music",
            letter: "M"
        },
        {
            name: "Trending",
            letter: "T"
        }
    ];

    sampleStories.forEach(function (story) {

        const button =
            document.createElement("button");

        button.type = "button";
        button.className =
            "interstellar-story-card";

        button.innerHTML = `
            <div class="interstellar-story-avatar">
                <span>${story.letter}</span>
            </div>

            <span class="interstellar-story-name">
                ${story.name}
            </span>
        `;

        storyList.appendChild(button);

    });

    console.log(
        "INTERSTELLAR NEW STORY UI READY"
    );

})();


/* =========================================
   INTERSTELLAR — NEW STORY VIEWER CONTROLLER
========================================= */

window.addEventListener("load", function () {

    const viewer = document.getElementById(
        "interstellar-story-viewer"
    );

    const viewerName = document.getElementById(
        "interstellar-story-viewer-name"
    );

    const viewerAvatar = document.getElementById(
        "interstellar-story-viewer-avatar"
    );

    const viewerMessage = document.getElementById(
        "interstellar-story-viewer-message"
    );

    const closeButton = document.getElementById(
        "interstellar-story-viewer-close"
    );

    const previousButton = document.getElementById(
        "interstellar-story-viewer-prev"
    );

    const nextButton = document.getElementById(
        "interstellar-story-viewer-next"
    );

    const storyList = document.getElementById(
        "interstellar-story-list"
    );

    if (
        !viewer ||
        !viewerName ||
        !viewerAvatar ||
        !viewerMessage ||
        !closeButton ||
        !previousButton ||
        !nextButton ||
        !storyList
    ) {
        console.error(
            "INTERSTELLAR STORY VIEWER ELEMENTS NOT FOUND"
        );
        return;
    }

    const baseStories = [
        {
            name: "Interstellar",
            letter: "I",
            message: "Welcome to INTERSTELLAR 🚀"
        },
        {
            name: "Football",
            letter: "F",
            message: "Football lives here ⚽"
        },
        {
            name: "Music",
            letter: "M",
            message: "Your world. Your sound. 🎵"
        },
        {
            name: "Trending",
            letter: "T",
            message: "What's happening now 🔥"
        }
    ];

    let stories = baseStories.slice();
    let currentIndex = 0;
    let currentMediaUrl = null;

    const DB_NAME = "interstellar-stories";
    const DB_VERSION = 1;
    const STORE_NAME = "stories";

    function openDatabase() {

        return new Promise(function (resolve, reject) {

            const request = indexedDB.open(
                DB_NAME,
                DB_VERSION
            );

            request.onupgradeneeded = function () {

                const database = request.result;

                if (
                    !database.objectStoreNames.contains(
                        STORE_NAME
                    )
                ) {
                    database.createObjectStore(
                        STORE_NAME,
                        {
                            keyPath: "id"
                        }
                    );
                }

            };

            request.onsuccess = function () {
                resolve(request.result);
            };

            request.onerror = function () {
                reject(request.error);
            };

        });

    }

    async function removeExpiredStories(stories, database) {
        const now = Date.now();
        const expiry = 24 * 60 * 60 * 1000;

        const activeStories = stories.filter(function (story) {
            return Number.isFinite(story.createdAt) &&
                now - story.createdAt < expiry &&
                now >= story.createdAt;
        });

        const expiredStories = stories.filter(function (story) {
            return !Number.isFinite(story.createdAt) ||
                now - story.createdAt >= expiry ||
                now < story.createdAt;
        });

        if (expiredStories.length) {
            const transaction = database.transaction(
                STORE_NAME,
                "readwrite"
            );
            const store = transaction.objectStore(STORE_NAME);

            expiredStories.forEach(function (story) {
                if (story.id !== undefined) {
                    store.delete(story.id);
                }
            });

            await new Promise(function (resolve, reject) {
                transaction.oncomplete = resolve;
                transaction.onerror = function () {
                    reject(transaction.error);
                };
                transaction.onabort = function () {
                    reject(transaction.error);
                };
            });
        }

        return activeStories;
    }

    async function getSavedStories() {

        try {

            const database =
                await openDatabase();

            return await new Promise(
                function (resolve, reject) {

                    const transaction =
                        database.transaction(
                            STORE_NAME,
                            "readonly"
                        );

                    const store =
                        transaction.objectStore(
                            STORE_NAME
                        );

                    const request =
                        store.getAll();

                    request.onsuccess =
                        function () {

                            const result =
                                request.result || [];

                            removeExpiredStories(result, database)
                                .then(function (activeStories) {
                                    database.close();

                                    activeStories.sort(
                                function (a, b) {
                                    return (
                                        a.createdAt -
                                        b.createdAt
                                    );
                                }
                            );

                                    resolve(activeStories);
                                })
                                .catch(function (error) {
                                    database.close();
                                    reject(error);
                                });

                        };

                    request.onerror =
                        function () {

                            database.close();
                            reject(request.error);

                        };

                }
            );

        } catch (error) {

            console.error(
                "STORY DATABASE READ FAILED:",
                error
            );

            return [];

        }

    }

    function cleanupViewerMedia() {

        const body =
            viewer.querySelector(
                ".interstellar-story-viewer-body"
            );

        if (body) {
if (body._interstellarTextTimer) {
    clearTimeout(body._interstellarTextTimer);
    body._interstellarTextTimer = null;
}
            const video =
                body.querySelector(
                    ".interstellar-story-video"
                );

            if (video) {

                if (
                    video._interstellarProgressFrame
                ) {
                    cancelAnimationFrame(
                        video._interstellarProgressFrame
                    );
                }

                video.pause();
                video.removeAttribute("src");
                video.load();
                video.remove();

            }

            const progress =
                body.querySelector(
                    ".interstellar-story-progress-wrap"
                );

            if (progress) {
                progress.remove();
            }

            const tapLayer =
                body.querySelector(
                    ".interstellar-story-tap-layer"
                );

            if (tapLayer) {
                tapLayer.remove();
            }

            const media = body.querySelectorAll(
    ".interstellar-saved-story-media"
);

media.forEach(function (element) {
    if (element._interstellarPhotoTimer) {
        clearTimeout(element._interstellarPhotoTimer);
        element._interstellarPhotoTimer = null;
    }

    element.remove();
});

            media.forEach(
                function (element) {
                    element.remove();
                }
            );
        }

        if (currentMediaUrl) {

            URL.revokeObjectURL(
                currentMediaUrl
            );

            currentMediaUrl = null;
        }
    }


    function renderStoryMedia(story) {

        const body =
            viewer.querySelector(
                ".interstellar-story-viewer-body"
            );

        if (!body) {
            return;
        }

        
cleanupViewerMedia();

if (!story.file) {
    const textTimer = setTimeout(function () {
        if (
            viewer.style.display === "flex" &&
            stories[currentIndex] === story
        ) {
            nextStory();
        }
    }, 5000);

    body._interstellarTextTimer = textTimer;
    return;
}

currentMediaUrl =
    URL.createObjectURL(
        story.file
    );

        if (
            story.type &&
            story.type.startsWith("video/")
        ) {

            const video =
                document.createElement("video");

            
video.className =
    "interstellar-story-video";

video.style.opacity = "0";
video.style.transition = "opacity 0.15s ease";

video.addEventListener("loadeddata", function () {
    video.style.opacity = "1";
});

            video.src =
                currentMediaUrl;

            video.autoplay = true;
video.muted = false;
video.defaultMuted = false;
video.removeAttribute("muted");
            video.controls = false;
            video.playsInline = true;
            video.preload = "auto";
            video.disablePictureInPicture = true;

            video.setAttribute(
                "autoplay",
                ""
            );

            video.setAttribute(
                "muted",
                ""
            );

            video.setAttribute(
                "playsinline",
                ""
            );

            video.setAttribute(
                "webkit-playsinline",
                ""
            );

            video.setAttribute(
                "disablepictureinpicture",
                ""
            );

            video.setAttribute(
                "controlslist",
                "nodownload nofullscreen noremoteplayback"
            );

            body.appendChild(video);


            /* TOP STORY PROGRESS */

            const progressWrap =
                document.createElement("div");

            progressWrap.className =
                "interstellar-story-progress-wrap";

            const progressBar =
                document.createElement("div");

            progressBar.className =
                "interstellar-story-progress-bar";

            progressWrap.appendChild(
                progressBar
            );

            body.appendChild(
                progressWrap
            );


            /* STORY TAP AREAS */

            const tapLayer =
                document.createElement("div");

            tapLayer.className =
                "interstellar-story-tap-layer";

            const leftTap =
                document.createElement("div");

            leftTap.className =
                "interstellar-story-tap-left";

            const centerTap =
                document.createElement("div");

            centerTap.className =
                "interstellar-story-tap-center";

            const rightTap =
                document.createElement("div");

            rightTap.className =
                "interstellar-story-tap-right";

            tapLayer.appendChild(leftTap);
            tapLayer.appendChild(centerTap);
            tapLayer.appendChild(rightTap);

            body.appendChild(tapLayer);


            /* PREVIOUS */

            leftTap.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();
                    event.stopPropagation();

                    previousStory();
                }
            );


            /* NEXT */

            rightTap.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();
                    event.stopPropagation();

                    nextStory();
                }
            );


            /* PAUSE / RESUME */

            centerTap.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();
                    event.stopPropagation();

                    if (video.paused) {

                        video.play().catch(
                            function () {}
                        );

                    } else {

                        video.pause();

                    }
                }
            );


            /* PROGRESS */

            function updateProgress() {

                if (
                    video.duration &&
                    Number.isFinite(
                        video.duration
                    )
                ) {

                    const percent =
                        (
                            video.currentTime /
                            video.duration
                        ) * 100;

                    progressBar.style.width =
                        percent + "%";
                }

                video._interstellarProgressFrame =
                    requestAnimationFrame(
                        updateProgress
                    );
            }

            updateProgress();


            /* NEXT STORY AFTER VIDEO */

            video.addEventListener(
                "ended",
                function () {
                    if (
                        viewer.style.display === "flex" &&
                        video.isConnected &&
                        body.querySelector(
                            ".interstellar-story-video"
                        ) === video
                    ) {
                        nextStory();
                    }
                }
            );

            /* REPORT VIDEO LOADING ERRORS */

            video.addEventListener(
                "error",
                function () {
                    console.error(
                        "INTERSTELLAR STORY VIDEO FAILED:",
                        video.error
                            ? video.error.message
                            : "Unknown video loading error"
                    );
                }
            );


            /*
             * START IMMEDIATELY.
             * MUTED AUTOPLAY IS REQUIRED
             * FOR ANDROID BROWSER AUTOPLAY.
             */

            video.muted = false;
            video.defaultMuted = false;
            video.removeAttribute("muted");

            const playPromise =
                video.play();

            if (
                playPromise &&
                typeof playPromise.catch ===
                "function"
            ) {

                playPromise.catch(
                    function (error) {

                        console.log(
                            "INTERSTELLAR VIDEO PLAY BLOCKED:",
                            error
                        );

                    }
                );
            }

        } else {

            const image =
                document.createElement("img");

            image.className =
                "interstellar-saved-story-media";

            image.src =
                currentMediaUrl;

            image.alt =
                "Your Story";

            
body.appendChild(image);

// Automatically advance photo stories after 5 seconds.
console.log("PHOTO STORY TIMER STARTED");
          const photoTimer = setTimeout(function () {
    if (
        viewer.style.display === "flex" &&
        image.isConnected &&
        body.querySelector(
            ".interstellar-saved-story-media"
        ) === image
    ) {
        nextStory();
    }
}, 5000);
image._interstellarPhotoTimer = photoTimer;

        }
    }


    function showStory(index) {

        if (!stories.length) {
            return;
        }

        if (index < 0) {
            index =
                stories.length - 1;
        }

        if (index >= stories.length) {
            index = 0;
        }

        currentIndex = index;

        const story =
            stories[currentIndex];

        viewerName.textContent =
            story.name;

        viewerAvatar.textContent =
            story.letter;

        viewerMessage.textContent =
            story.message || "";

        /*
         * SHOW VIEWER FIRST.
         * THIS ENSURES THE VIDEO IS CREATED
         * AS PART OF THE STORY OPENING.
         */

        viewer.style.display =
            "flex";

        document.body.style.overflow =
            "hidden";

        renderStoryMedia(story);
    }


    function closeStory() {

        cleanupViewerMedia();

        viewer.style.display =
            "none";

        document.body.style.overflow =
            "";

    }

    function nextStory() {
        if (viewer.style.display !== "flex") {
            return;
        }

        showStory(currentIndex + 1);
    }

    function previousStory() {
        if (viewer.style.display !== "flex") {
            return;
        }

        showStory(currentIndex - 1);
    }

    async function rebuildStorySequence() {

        const savedStories =
            await getSavedStories();

        const savedForViewer =
            savedStories.map(
                function (story) {

                    return {
                        name: "Your Story",
                        letter: "E",
                        message: story.text || "",
                        file: story.file || null,
                        type: story.type || "",
                        savedStoryId: story.id
                    };

                }
            );

        stories =
            baseStories.concat(
                savedForViewer
            );

    }

    async function openStoryFromRow(index) {

        await rebuildStorySequence();

        showStory(index);

    }

    const storyCards =
        storyList.querySelectorAll(
            ".interstellar-story-card"
        );

    storyCards.forEach(
        function (card, index) {

            card.addEventListener(
                "click",
                async function () {

                    if (index === 0) {
                        return;
                    }

                    await openStoryFromRow(
                        index - 1
                    );

                }
            );

        }
    );

    closeButton.addEventListener(
        "click",
        closeStory
    );

    nextButton.addEventListener(
        "click",
        nextStory
    );

    previousButton.addEventListener(
        "click",
        previousStory
    );

    window.addEventListener(
        "interstellar-open-saved-story",
        async function (event) {

            const storyId =
                event.detail &&
                event.detail.storyId;

            await rebuildStorySequence();

            const index =
                stories.findIndex(
                    function (story) {
                        return (
                            story.savedStoryId ===
                            storyId
                        );
                    }
                );

            if (index !== -1) {
                showStory(index);
            }

        }
    );

    console.log(
        "INTERSTELLAR STORY NAVIGATION READY"
    );

});

/* =========================================
   INTERSTELLAR — STORY CREATION CONTROLLER
========================================= */

window.addEventListener("load", function () {

    const addStoryButton =
        document.getElementById(
            "interstellar-add-story"
        );

    const creator =
        document.getElementById(
            "interstellar-story-creator"
        );

    const closeButton =
        document.getElementById(
            "interstellar-story-creator-close"
        );

    const photoInput =
        document.getElementById(
            "interstellar-story-photo-input"
        );

    const videoInput =
        document.getElementById(
            "interstellar-story-video-input"
        );

    const preview =
        document.getElementById(
            "interstellar-story-preview"
        );

    const textInput =
        document.getElementById(
            "interstellar-story-text"
        );

    const postButton =
        document.getElementById(
            "interstellar-story-post"
        );

    const storyList =
        document.getElementById(
            "interstellar-story-list"
        );

    if (
        !addStoryButton ||
        !creator ||
        !closeButton ||
        !photoInput ||
        !videoInput ||
        !preview ||
        !textInput ||
        !postButton ||
        !storyList
    ) {
        console.error(
            "INTERSTELLAR STORY CREATOR ELEMENTS NOT FOUND"
        );
        return;
    }

    let selectedFile = null;
    let previewUrl = null;

    const DB_NAME = "interstellar-stories";
    const DB_VERSION = 1;
    const STORE_NAME = "stories";

    function openDatabase() {

        return new Promise(function (resolve, reject) {

            const request =
                indexedDB.open(
                    DB_NAME,
                    DB_VERSION
                );

            request.onupgradeneeded =
                function () {

                    const database =
                        request.result;

                    if (
                        !database.objectStoreNames.contains(
                            STORE_NAME
                        )
                    ) {

                        database.createObjectStore(
                            STORE_NAME,
                            {
                                keyPath: "id"
                            }
                        );
                    }
                };

            request.onsuccess =
                function () {
                    resolve(request.result);
                };

            request.onerror =
                function () {
                    reject(request.error);
                };

        });

    }

    async function saveStory(story) {
        const database = await Promise.race([
            openDatabase(),
            new Promise(function (_, reject) {
                setTimeout(function () {
                    reject(new Error("Opening story storage timed out."));
                }, 12000);
            })
        ]);

        return new Promise(function (resolve, reject) {
            let finished = false;
            const timeout = setTimeout(function () {
                if (finished) return;
                finished = true;
                try { database.close(); } catch (_) {}
                reject(new Error("Saving the story timed out."));
            }, 12000);

            function finish(error) {
                if (finished) return;
                finished = true;
                clearTimeout(timeout);
                try { database.close(); } catch (_) {}
                if (error) reject(error);
                else resolve();
            }

            let transaction;
            try {
                transaction = database.transaction(STORE_NAME, "readwrite");
                transaction.objectStore(STORE_NAME).put(story);
                transaction.oncomplete = function () {
                    finish(null);
                };
                transaction.onerror = function () {
                    finish(transaction.error || new Error("Story save failed."));
                };
                transaction.onabort = function () {
                    finish(transaction.error || new Error("Story save was cancelled."));
                };
            } catch (error) {
                finish(error);
            }
        });
    }

    async function getStories() {

        const database =
            await openDatabase();

        return new Promise(function (resolve, reject) {

            const transaction =
                database.transaction(
                    STORE_NAME,
                    "readonly"
                );

            const store =
                transaction.objectStore(
                    STORE_NAME
                );

            const request =
                store.getAll();

            request.onsuccess =
                function () {

                    const stories =
                        request.result || [];

                    removeExpiredStories(stories, database)
                        .then(function (activeStories) {
                            database.close();

                            activeStories.sort(function (a, b) {
                                return b.createdAt - a.createdAt;
                            });

                            resolve(activeStories);
                        })
                        .catch(function (error) {
                            database.close();
                            reject(error);
                        });
                };

            request.onerror =
                function () {

                    database.close();
                    reject(request.error);

                };

        });

    }

    function openCreator() {

        creator.style.display = "flex";
        document.body.style.overflow = "hidden";

    }

    function clearPreview() {

        const previewVideo =
            preview.querySelector("video");

        if (previewVideo) {

            previewVideo.pause();
            previewVideo.currentTime = 0;
            previewVideo.removeAttribute("src");
            previewVideo.load();

        }

        if (previewUrl) {

            URL.revokeObjectURL(
                previewUrl
            );

            previewUrl = null;

        }

        preview.innerHTML =
            "<span>Your story preview will appear here</span>";

        selectedFile = null;

        photoInput.value = "";
        videoInput.value = "";

        textInput.value = "";

    }

    function closeCreator() {

        clearPreview();

        creator.style.display = "none";
        document.body.style.overflow = "";

    }

    
function createStoryCard(story) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "interstellar-story-card";
    button.dataset.storyCreator = "current-user";

    const avatar = document.createElement("div");
    avatar.className = "interstellar-story-avatar";
    avatar.textContent = "E";

    const name = document.createElement("span");
    name.className = "interstellar-story-name";
    name.textContent = "Your Story";

    button.appendChild(avatar);
    button.appendChild(name);

    button.addEventListener("click", async function () {
        const stories = await getStories();

        if (!stories.length) return;

        window.dispatchEvent(
            new CustomEvent("interstellar-open-saved-story", {
                detail: {
                    storyId: story.id
                }
            })
        );
    });

    return button;
}

    async function openSavedStory(story) {

        const viewer =
            document.getElementById(
                "interstellar-story-viewer"
            );

        const viewerName =
            document.getElementById(
                "interstellar-story-viewer-name"
            );

        const viewerAvatar =
            document.getElementById(
                "interstellar-story-viewer-avatar"
            );

        const viewerMessage =
            document.getElementById(
                "interstellar-story-viewer-message"
            );

        if (
            !viewer ||
            !viewerName ||
            !viewerAvatar ||
            !viewerMessage
        ) {
            return;
        }

        viewerName.textContent =
            "Your Story";

        viewerAvatar.textContent =
            "E";

        viewerMessage.textContent =
            story.text || "";

        viewer.style.display = "flex";

        document.body.style.overflow =
            "hidden";

        const body =
            viewer.querySelector(
                ".interstellar-story-viewer-body"
            );

        if (!body) {
            return;
        }

        const oldMedia =
            body.querySelector(
                ".interstellar-saved-story-media"
            );

        if (oldMedia) {
            oldMedia.remove();
        }

        if (story.file) {

            const url =
                URL.createObjectURL(
                    story.file
                );

            if (
                story.type &&
                story.type.startsWith("video/")
            ) {

                const video =
                    document.createElement(
                        "video"
                    );

                video.className =
                    "interstellar-saved-story-media";

                
                video.controls = false;
                video.playsInline = true;

                video.setAttribute("autoplay", "");
                video.setAttribute("muted", "");
                video.setAttribute("playsinline", "");
                video.setAttribute("webkit-playsinline", "");

                video.src = url;

                body.appendChild(video);

            } else {

                const image =
                    document.createElement(
                        "img"
                    );

                image.className =
                    "interstellar-saved-story-media";

                image.src = url;
                image.alt = "Your Story";

                body.appendChild(image);

            }



        }

    }

    

async function renderSavedStories() {
    const stories = await getStories();

    // Remove only previously created user-story cards.
    storyList
        .querySelectorAll(
            '.interstellar-story-card[data-story-creator="current-user"]'
        )
        .forEach(function (card) {
            card.remove();
        });

    // Keep Add Story and restore your saved-story circle.
    const addButton = document.getElementById("interstellar-add-story");
    if (stories.length > 0) {
        const card = createStoryCard(stories[0]);
        if (addButton && addButton.parentElement === storyList) {
            addButton.insertAdjacentElement("afterend", card);
        } else {
            storyList.appendChild(card);
        }
    }
}

    addStoryButton.addEventListener(
        "click",
        function (event) {

            event.preventDefault();
            event.stopPropagation();

            openCreator();

        }
    );

    closeButton.addEventListener(
        "click",
        closeCreator
    );

    creator.addEventListener(
        "click",
        function (event) {

            if (event.target === creator) {
                closeCreator();
            }

        }
    );

    function handleSelectedMedia(file) {

        if (!file) {
            return;
        }

        selectedFile = file;

        if (previewUrl) {

            URL.revokeObjectURL(
                previewUrl
            );

        }

        previewUrl =
            URL.createObjectURL(file);

        preview.innerHTML = "";

        if (file.type.startsWith("image/")) {

            const image =
                document.createElement("img");

            image.src = previewUrl;
            image.alt = "Story preview";

            preview.appendChild(image);

        } else if (file.type.startsWith("video/")) {

            

const video =
    document.createElement("video");

video.className = "interstellar-create-preview-video";
video.src = previewUrl;
video.controls = true;
video.playsInline = true;
video.preload = "auto";
video.muted = true;
video.autoplay = true;

preview.appendChild(video);

video.play().catch(function () {
    console.log("Create preview requires manual playback.");
});


        } else {

            preview.innerHTML =
                "<span>Unsupported file type</span>";

            selectedFile = null;

        }

    }

    photoInput.addEventListener(
        "change",
        function () {

            handleSelectedMedia(
                photoInput.files[0]
            );

        }
    );

    videoInput.addEventListener(
        "change",
        function () {

            handleSelectedMedia(
                videoInput.files[0]
            );

        }
    );

    postButton.addEventListener("click", async function () {
    function showStoryNotice(message, isError) {
        let notice = document.getElementById("interstellar-story-notice");
        if (!notice) {
            notice = document.createElement("div");
            notice.id = "interstellar-story-notice";
            document.body.appendChild(notice);
        }

        notice.textContent = message;
        notice.style.cssText =
            "position:fixed;left:50%;bottom:90px;transform:translateX(-50%);" +
            "z-index:999999;padding:13px 18px;border-radius:12px;" +
            "color:#fff;font-size:14px;font-weight:600;text-align:center;" +
            "max-width:90%;box-shadow:0 4px 18px rgba(0,0,0,.3);";
        notice.style.background = isError ? "#b42318" : "#18794e";

        if (window.__interstellarStoryNoticeTimer) {
            clearTimeout(window.__interstellarStoryNoticeTimer);
        }
        window.__interstellarStoryNoticeTimer = setTimeout(function () {
            notice.remove();
        }, 3500);
    }

    const text = textInput.value.trim();

    if (!selectedFile && !text) {
        showStoryNotice("Add a photo, video, or text before posting.", true);
        return;
    }

    const originalLabel = postButton.textContent;
    postButton.disabled = true;
    postButton.textContent = "Posting...";

    const story = {
        id: "story-" + Date.now() + "-" +
            Math.random().toString(36).slice(2),
        file: selectedFile ? selectedFile : null,
        type: selectedFile ? selectedFile.type : "",
        text: text,
        createdAt: Date.now()
    };

    try {
        await saveStory(story);
        renderSavedStories().catch(function (error) { console.error("STORY LIST REFRESH FAILED:", error); });
        closeCreator();
        showStoryNotice("Story posted successfully.", false);
    } catch (error) {
        console.error("STORY SAVE FAILED:", error);
        showStoryNotice("Story could not be posted. Please try again.", true);
    } finally {
        postButton.disabled = false;
        postButton.textContent = originalLabel;
    }
});

    renderSavedStories();

    setInterval(function () {
        renderSavedStories();
    }, 60 * 1000);

    console.log(
        "INTERSTELLAR STORY STORAGE READY"
    );

});


/* INTERSTELLAR — HOMEPAGE SAVED STORY CIRCLE RECOVERY */
window.addEventListener("load", function () {
    const list = document.getElementById("interstellar-story-list");
    const addButton = document.getElementById("interstellar-add-story");

    if (!list || !addButton || !window.indexedDB) return;

    function refreshHomepageStoryCircle() {
        const request = indexedDB.open("interstellar-stories");

        request.onsuccess = function () {
            const db = request.result;

            if (!db.objectStoreNames.contains("stories")) {
                db.close();
                return;
            }

            const tx = db.transaction("stories", "readonly");
            const getRequest = tx.objectStore("stories").getAll();

            getRequest.onsuccess = function () {
                const now = Date.now();
                const expiry = 24 * 60 * 60 * 1000;
                const active = (getRequest.result || [])
                    .filter(s => Number.isFinite(s.createdAt) &&
                        now >= s.createdAt &&
                        now - s.createdAt < expiry)
                    .sort((a, b) => b.createdAt - a.createdAt);

                list.querySelectorAll(
                    '.interstellar-home-recovered-story'
                ).forEach(card => card.remove());

                if (
                    active.length &&
                    !list.querySelector(
                        '.interstellar-story-card[data-story-creator="current-user"]'
                    )
                ) {
                    const story = active[0];
                    const card = document.createElement("button");
                    card.type = "button";
                    card.className =
                        "interstellar-story-card interstellar-home-recovered-story";
                    card.dataset.storyCreator = "current-user";

                    const avatar = document.createElement("div");
                    avatar.className = "interstellar-story-avatar";
                    avatar.textContent = "E";

                    const name = document.createElement("span");
                    name.className = "interstellar-story-name";
                    name.textContent = "Your Story";

                    card.append(avatar, name);
                    card.addEventListener("click", function () {
                        window.dispatchEvent(new CustomEvent(
                            "interstellar-open-saved-story",
                            { detail: { storyId: story.id } }
                        ));
                    });

                    addButton.insertAdjacentElement("afterend", card);
                }

                db.close();
            };

            getRequest.onerror = function () {
                db.close();
                console.error("Could not load homepage stories.");
            };
        };

        request.onerror = function () {
            console.error("Could not open saved stories.");
        };
    }

    refreshHomepageStoryCircle();
    setInterval(refreshHomepageStoryCircle, 60 * 1000);
});

/* =========================================
   INTERSTELLAR — INTERACTIVE DISCOVER
========================================= */

(function () {
    const discoverPage = document.getElementById("discover-page");
    const searchInput = document.getElementById("discover-search-input");
    const results = document.getElementById("discover-results");

    if (!discoverPage || !searchInput || !results) {
        console.warn("Discover elements not found.");
        return;
    }

    let discoverVideos = [];
    let selectedCategory = "For You";

    const categoryButtons = Array.from(
        discoverPage.querySelectorAll(".discover-category")
    );

    const topicButtons = discoverPage.querySelectorAll(
        "[data-topic]"
    );

    function normalize(value) {
        return String(value || "")
            .toLowerCase()
            .replace(/^#/, "")
            .trim();
    }

    function getCreator(video) {
        return video.displayName ||
            video.username ||
            "INTERSTELLAR User";
    }

    function getSearchText(video) {
        return [
            video.caption,
            video.username,
            video.displayName,
            video.title,
            ...(Array.isArray(video.hashtags) ? video.hashtags : []),
            ...(Array.isArray(video.tags) ? video.tags : [])
        ].join(" ").toLowerCase();
    }

    function makeElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined) {
            element.textContent = text;
        }

        return element;
    }

    function showEmpty(message) {
        results.replaceChildren(
            makeElement("p", "discover-empty", message)
        );
    }

    let discoverPeople = [];
    let discoverPeopleLoaded = false;
    let discoverPeopleLoading = false;

    function renderPeople(people) {
        const query = normalize(searchInput.value);
        const matchingPeople = people.filter(function (person) {
            const text = [
                person.username,
                person.displayName,
                person.bio
            ].join(" ").toLowerCase();

            return !query || text.includes(query);
        });

        if (!matchingPeople.length) {
            showEmpty(
                query
                    ? "No registered users match your search."
                    : "No other registered users were found yet."
            );
            return;
        }

        const fragment = document.createDocumentFragment();

        matchingPeople.forEach(function (person) {
            const userId = person.userId;
            const name = person.displayName || person.username || "INTERSTELLAR User";
            const card = makeElement("article", "discover-person-card");
            card.dataset.userId = userId;

            const avatar = makeElement("div", "discover-person-avatar");

            if (person.profilePhotoUrl) {
                const photo = document.createElement("img");
                photo.src = person.profilePhotoUrl;
                photo.alt = name + " profile photo";
                photo.loading = "lazy";
                photo.onerror = function () {
                    photo.remove();
                    avatar.textContent = name.charAt(0).toUpperCase();
                };
                avatar.appendChild(photo);
            } else {
                avatar.textContent = name.charAt(0).toUpperCase();
            }

            const details = makeElement("div", "discover-person-details");
            details.appendChild(makeElement("strong", "", name));

            if (person.username) {
                details.appendChild(
                    makeElement("p", "", "@" + person.username)
                );
            }

            if (person.bio) {
                details.appendChild(
                    makeElement("p", "discover-person-bio", person.bio)
                );
            }

            const followerCount = Number(person.followersCount || 0);
            const followerLabel = makeElement(
                "small",
                "discover-person-followers",
                followerCount + (followerCount === 1 ? " follower" : " followers")
            );
            details.appendChild(followerLabel);

            const followButton = makeElement(
                "button",
                "discover-person-follow",
                person.following ? "Following" : "Follow"
            );

            followButton.type = "button";
            followButton.dataset.following = person.following ? "true" : "false";
            followButton.setAttribute(
                "aria-label",
                (person.following ? "Unfollow " : "Follow ") + name
            );

            followButton.addEventListener("click", async function () {
                const wasFollowing = followButton.dataset.following === "true";

                await toggleFollow(userId, followButton);

                const isFollowing = followButton.dataset.following === "true";

                if (wasFollowing !== isFollowing) {
                    const updatedCount = Math.max(
                        0,
                        Number(person.followersCount || 0) +
                            (isFollowing ? 1 : -1)
                    );

                    person.followersCount = updatedCount;
                    followerLabel.textContent =
                        updatedCount +
                        (updatedCount === 1 ? " follower" : " followers");

                    person.following = isFollowing;
                    followButton.setAttribute(
                        "aria-label",
                        (isFollowing ? "Unfollow " : "Follow ") + name
                    );
                }
            });

            card.append(avatar, details, followButton);
            fragment.appendChild(card);
        });

        results.replaceChildren(fragment);
    }

    async function loadDiscoverPeople() {
        if (discoverPeopleLoading) return;

        if (discoverPeopleLoaded) {
            renderDiscover();
            return;
        }

        const token = getAccessToken();

        if (!token) {
            showEmpty("Sign in to discover and follow people.");
            return;
        }

        discoverPeopleLoading = true;
        showEmpty("Finding people on INTERSTELLAR...");

        try {
            const response = await fetch(
                API_BASE_URL + "/v1/discover/users",
                {
                    headers: {
                        "Authorization": "Bearer " + token
                    }
                }
            );

            if (response.status === 401) {
                clearTokens();
                showLogin();
                showEmpty("Please sign in again to discover people.");
                return;
            }

            if (!response.ok) {
                throw new Error("People Discovery request failed: " + response.status);
            }

            const data = await response.json();
            discoverPeople = Array.isArray(data.users) ? data.users : [];
            discoverPeopleLoaded = true;
            renderDiscover();
        } catch (error) {
            console.error("PEOPLE DISCOVERY ERROR:", error);
            showEmpty("Unable to load people. Check your connection and try again.");

            const retryButton = makeElement("button", "discover-person-view", "Try again");
            retryButton.type = "button";
            retryButton.addEventListener("click", function () {
                discoverPeopleLoaded = false;
                loadDiscoverPeople();
            });
            results.appendChild(retryButton);
        } finally {
            discoverPeopleLoading = false;
        }
    }

    function renderVideoCards(videos) {
        const fragment = document.createDocumentFragment();

        videos.slice(0, 12).forEach(function (video) {
            const card = makeElement(
                "article",
                "discover-video-card"
            );

            const media = document.createElement("video");

            media.controls = true;
            media.preload = "metadata";
            media.playsInline = true;
            media.muted = true;
            media.src = video.videoUrl;

            if (video.thumbnailUrl) {
                media.poster = video.thumbnailUrl;
            }

            media.setAttribute(
                "aria-label",
                "Video by " + getCreator(video)
            );

            const info = makeElement(
                "div",
                "discover-video-info"
            );

            info.appendChild(
                makeElement(
                    "strong",
                    "discover-video-creator",
                    "@" + (video.username || getCreator(video))
                )
            );

            info.appendChild(
                makeElement(
                    "p",
                    "discover-video-caption",
                    video.caption || "No caption"
                )
            );

            card.append(media, info);
            fragment.appendChild(card);
        });

        if (!videos.length) {
            showEmpty(
                "No matching videos found. Try another search or topic."
            );
            return;
        }

        results.replaceChildren(fragment);

        if (videos.length > 12) {
            results.appendChild(
                makeElement(
                    "p",
                    "discover-empty",
                    "Showing 12 results. Refine your search to find more."
                )
            );
        }
    }

    function updateCategoryButtons() {
        categoryButtons.forEach(function (button) {
            const active =
                button.dataset.category === selectedCategory;

            button.classList.toggle("active", active);
            button.setAttribute(
                "aria-pressed",
                String(active)
            );
        });
    }

    function renderDiscover() {
        const query = normalize(searchInput.value);

        let matchingVideos = discoverVideos.filter(
            function (video) {
                return (
                    video.status === "ready" &&
                    Boolean(video.videoUrl)
                );
            }
        );

        if (query) {
            matchingVideos = matchingVideos.filter(
                function (video) {
                    return getSearchText(video).includes(query);
                }
            );
        }

        if (selectedCategory === "Trending") {
            matchingVideos.sort(function (a, b) {
                const scoreA =
                    Number(a.views || a.viewCount || 0) +
                    Number(a.likes || a.likeCount || 0) * 10;

                const scoreB =
                    Number(b.views || b.viewCount || 0) +
                    Number(b.likes || b.likeCount || 0) * 10;

                return scoreB - scoreA;
            });
        }

        if (selectedCategory === "People") {
            renderPeople(discoverPeople);
            return;
        }

        renderVideoCards(matchingVideos);
    }

    categoryButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            selectedCategory = button.dataset.category;
            updateCategoryButtons();

            if (selectedCategory === "People") {
                loadDiscoverPeople();
            } else {
                renderDiscover();
            }
        });
    });

    searchInput.addEventListener("input", renderDiscover);

    topicButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            searchInput.value = button.dataset.topic || "";
            selectedCategory = "For You";

            updateCategoryButtons();
            renderDiscover();

            results.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    });

    /*
     * Connect Discover to the existing video renderer.
     * The original Home video rendering remains intact.
     */

    const originalRenderVideos = renderVideos;

    renderVideos = function (videos) {
        discoverVideos = Array.isArray(videos)
            ? videos.slice()
            : [];

        originalRenderVideos(videos);
        renderDiscover();
    };

    updateCategoryButtons();
    showEmpty("Loading videos for Discover...");

    console.log("INTERSTELLAR DISCOVER INTERACTIONS READY");
})();



/* =========================================
   INTERSTELLAR CREATOR PROFILE PREVIEW
   Uses the existing Follow/Unfollow function
========================================= */

(function () {
    "use strict";

    const preview = document.getElementById("creator-profile-preview");
    if (!preview) return;

    const photo = document.getElementById("creator-preview-photo");
    const placeholder = document.getElementById("creator-preview-photo-placeholder");
    const nameElement = document.getElementById("creator-preview-name");
    const usernameElement = document.getElementById("creator-preview-username");
    const bioElement = document.getElementById("creator-preview-bio");
    const postsElement = document.getElementById("creator-preview-posts");
    const messageElement = document.getElementById("creator-preview-message");
    const postCountElement = document.getElementById("creator-preview-post-count");
    const followersElement = document.getElementById("creator-preview-followers");
    const followingElement = document.getElementById("creator-preview-following");
    const followButton = document.getElementById("creator-preview-follow-button");
    const backButton = document.getElementById("creator-preview-back");

    let currentUserId = null;
    let currentFollowersCount = 0;
    let currentFollowing = false;
    let previousPage = "discover-page";

    function setMessage(message) {
        messageElement.textContent = message;
    }

    function showCount(value) {
        return Number(value || 0).toLocaleString();
    }

    function makePreviewElement(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    function renderPreviewVideos(videos) {
        postsElement.replaceChildren();

        if (!videos.length) {
            postsElement.appendChild(
                makePreviewElement("p", "creator-preview-empty", "This creator has not posted any videos yet.")
            );
            return;
        }

        const fragment = document.createDocumentFragment();

        videos.forEach(function (item) {
            const card = makePreviewElement("article", "creator-preview-video-card");
            const video = document.createElement("video");

            video.controls = true;
            video.preload = "metadata";
            video.playsInline = true;
            video.src = item.videoUrl || "";

            if (item.thumbnailUrl) video.poster = item.thumbnailUrl;

            const caption = makePreviewElement(
                "p",
                "creator-preview-video-caption",
                item.caption || "No caption"
            );

            card.append(video, caption);
            fragment.appendChild(card);
        });

        postsElement.appendChild(fragment);
    }

    async function openCreatorProfile(userId) {
        const token = getAccessToken();

        if (!token) {
            showLogin();
            setMessage("Please sign in to view creator profiles.");
            return;
        }

        currentUserId = userId;
        currentFollowersCount = 0;
        currentFollowing = false;

        nameElement.textContent = "Loading profile...";
        usernameElement.textContent = "";
        bioElement.textContent = "";
        postCountElement.textContent = "—";
        followersElement.textContent = "—";
        followingElement.textContent = "—";
        postsElement.replaceChildren();
        followButton.hidden = true;
        setMessage("Loading creator profile...");

        preview.hidden = false;
        switchPage("creator-profile-preview");

        try {
            const headers = { Authorization: "Bearer " + token };

            const responses = await Promise.all([
                fetch(
                    API_BASE_URL + "/v1/users/" + encodeURIComponent(userId),
                    { headers: headers }
                ),
                fetch(
                    API_BASE_URL + "/v1/users/" + encodeURIComponent(userId) + "/videos",
                    { headers: headers }
                )
            ]);

            if (responses.some(function (response) {
                return response.status === 401;
            })) {
                clearTokens();
                showLogin();
                setMessage("Your session expired. Please sign in again.");
                return;
            }

            if (!responses[0].ok) {
                throw new Error("Profile request failed: " + responses[0].status);
            }

            if (!responses[1].ok) {
                throw new Error("Videos request failed: " + responses[1].status);
            }

            const profileData = await responses[0].json();
            const videosData = await responses[1].json();
            const user = profileData.user;

            if (!user) throw new Error("Creator profile was not found.");

            nameElement.textContent =
                user.displayName || user.username || "INTERSTELLAR User";

            usernameElement.textContent = user.username ? "@" + user.username : "";
            bioElement.textContent = user.bio || "No bio yet.";

            if (user.profilePhotoUrl) {
                photo.onload = function () {
                    photo.hidden = false;
                    placeholder.hidden = true;
                };

                photo.onerror = function () {
                    photo.hidden = true;
                    placeholder.hidden = false;
                };

                photo.src = user.profilePhotoUrl;
            } else {
                photo.removeAttribute("src");
                photo.hidden = true;
                placeholder.hidden = false;
            }

            placeholder.textContent =
                (user.displayName || user.username || "✦").charAt(0).toUpperCase();

            currentFollowersCount = Number(user.followersCount || 0);
            currentFollowing = Boolean(user.following);

            followersElement.textContent = showCount(currentFollowersCount);
            followingElement.textContent = showCount(user.followingCount);
            
            const videos = Array.isArray(videosData.videos)
                ? videosData.videos
                : [];

            postCountElement.textContent = showCount(
                user.videosCount !== undefined ? user.videosCount : videos.length
            );

            followButton.hidden = Boolean(user.isOwnProfile);
            followButton.dataset.following = String(currentFollowing);
            followButton.textContent = currentFollowing ? "Following" : "Follow";
            followButton.setAttribute(
                "aria-label",
                (currentFollowing ? "Unfollow " : "Follow ") +
                    (user.displayName || user.username || "creator")
            );

            renderPreviewVideos(videos);
            setMessage("");
        } catch (error) {
            console.error("CREATOR PROFILE PREVIEW ERROR:", error);
            setMessage("Unable to load this profile. Check your connection and try again.");

            postsElement.replaceChildren(
                makePreviewElement("p", "creator-preview-empty", "Posts could not be loaded.")
            );
        }
    }

    document.addEventListener("click", function (event) {
        const card = event.target.closest(".discover-person-card");

        if (!card || !card.dataset.userId) return;
        if (event.target.closest("button")) return;

        openCreatorProfile(card.dataset.userId);
    });

    document.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        if (event.target.closest("button")) return;

        const card = event.target.closest(".discover-person-card");
        if (!card || !card.dataset.userId) return;

        event.preventDefault();
        openCreatorProfile(card.dataset.userId);
    });

    followButton.addEventListener("click", async function () {
        if (!currentUserId) return;

        const wasFollowing = followButton.dataset.following === "true";

        await toggleFollow(currentUserId, followButton);

        const isFollowing = followButton.dataset.following === "true";

        if (wasFollowing !== isFollowing) {
            currentFollowing = isFollowing;
            currentFollowersCount = Math.max(
                0,
                currentFollowersCount + (isFollowing ? 1 : -1)
            );

            followersElement.textContent = showCount(currentFollowersCount);
        }
    });

    backButton.addEventListener("click", function () {
        preview.hidden = true;
        switchPage(previousPage);
    });

    document.addEventListener("click", function (event) {
        const card = event.target.closest(".discover-person-card");
        if (card && card.dataset.userId) {
            previousPage = "discover-page";
        }
    });
})();



/* INTERSTELLAR VIDEO UPLOAD HANDLER */
(function () {
    const uploadButton = document.getElementById("upload-video-button");
    const fileInput = document.getElementById("video-file-input");
    const captionInput = document.getElementById("video-caption-input");
    const message = document.getElementById("video-upload-message");

    if (!uploadButton || !fileInput || !captionInput || !message) {
        console.warn("INTERSTELLAR video upload: required HTML elements not found.");
        return;
    }

    uploadButton.addEventListener("click", async function () {
        const file = fileInput.files && fileInput.files[0];
        const caption = captionInput.value.trim();
        const token = localStorage.getItem("interstellar_access_token");

        if (!token) {
            message.textContent = "Please log in before uploading a video.";
            if (typeof showLogin === "function") showLogin();
            return;
        }

        if (!file) {
            message.textContent = "Please select an MP4 video first.";
            return;
        }

        if (
            file.type !== "video/mp4" &&
            !file.name.toLowerCase().endsWith(".mp4")
        ) {
            message.textContent = "Please select an MP4 video.";
            return;
        }

        uploadButton.disabled = true;

        const originalLabel = uploadButton.textContent;
        uploadButton.textContent = "Uploading...";
        message.textContent = "Preparing your video upload...";

        try {
            const uploadUrlResponse = await fetch(
                `${API_BASE_URL}/v1/videos/upload-url`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        content_type: "video/mp4",
                        caption: caption
                    }),
                    signal: AbortSignal.timeout(20000)
                }
            );

            const uploadData = await uploadUrlResponse.json();

            if (!uploadUrlResponse.ok) {
                throw new Error(
                    uploadData?.error?.message ||
                    uploadData?.message ||
                    "Could not prepare the video upload."
                );
            }

            const video = uploadData.video;
            const upload = uploadData.upload;

            if (!video?.videoId || !upload?.url) {
                throw new Error("The server returned incomplete upload details.");
            }

            message.textContent = "Uploading video file...";

            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("PUT", upload.url, true);
                xhr.setRequestHeader(
                    "Content-Type",
                    upload.contentType || "video/mp4"
                );
                xhr.timeout = 180000;

                xhr.upload.addEventListener("progress", function (event) {
                    if (event.lengthComputable) {
                        const percent = Math.round(
                            (event.loaded / event.total) * 100
                        );
                        const loadedMB = (event.loaded / (1024 * 1024)).toFixed(1);
                        const totalMB = (event.total / (1024 * 1024)).toFixed(1);
                        message.textContent =
                            `Uploading video: ${percent}% (${loadedMB} / ${totalMB} MB)`;
                    }
                });

                xhr.addEventListener("load", function () {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve();
                    } else {
                        const detail = (xhr.responseText || "").slice(0, 500);
                        reject(new Error(
                            `Video file upload failed (HTTP ${xhr.status}).` +
                            (detail ? ` Server response: ${detail}` : "")
                        ));
                    }
                });

                xhr.addEventListener("error", function () {
                    reject(new Error(
                        "Video upload connection failed. Check your internet and try again."
                    ));
                });

                xhr.addEventListener("timeout", function () {
                    reject(new Error(
                        "Video upload timed out. Try a smaller video or a more stable connection."
                    ));
                });

                xhr.addEventListener("abort", function () {
                    reject(new Error("Video upload was interrupted."));
                });

                xhr.send(file);
            });

            message.textContent = "Finishing upload and starting processing...";

            const completeResponse = await fetch(
                `${API_BASE_URL}/v1/videos/${encodeURIComponent(video.videoId)}/complete`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    },
                    signal: AbortSignal.timeout(20000)
                }
            );

            const completeData = await completeResponse.json();

            if (!completeResponse.ok) {
                throw new Error(
                    completeData?.error?.message ||
                    completeData?.message ||
                    "The server could not complete the upload."
                );
            }

            message.textContent =
                "Upload successful! Your video is processing. Refresh Home in a little while to check for it.";

            fileInput.value = "";
            captionInput.value = "";

        } catch (error) {
            console.error("INTERSTELLAR video upload error:", error);
            message.textContent =
                error.message ||
                "Upload failed. Check your connection and try again.";
        } finally {
            uploadButton.disabled = false;
            uploadButton.textContent = originalLabel;
        }
    });

    console.log("INTERSTELLAR VIDEO UPLOAD HANDLER READY");
})();


/* FIX: FLOATING CREATE BUTTON NAVIGATION */
(function () {
    const floatingCreateButton = document.getElementById("floating-create-button");

    if (floatingCreateButton) {
        floatingCreateButton.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            switchPage("create-page");
        });
    }
})();




/* =========================================
   INTERSTELLAR VIDEO FILE PREVIEW
   Separate from the existing upload logic.
========================================= */
(function () {
    const fileInput = document.getElementById("video-file-input");
    const fileLabel = document.querySelector(
        '#create-page label[for="video-file-input"]'
    );

    if (!fileInput || !fileLabel) {
        console.warn("Video preview: file input or label not found.");
        return;
    }

    const previewBox = document.createElement("div");
    previewBox.id = "interstellar-video-preview";
    previewBox.hidden = true;

    previewBox.innerHTML = `
        <div class="video-preview-heading">Video preview</div>
        <div class="video-preview-frame">
            <video
                id="interstellar-preview-player"
                playsinline
                preload="metadata"
            ></video>
            <button type="button" id="interstellar-preview-play-button" aria-label="Play selected video">▶</button>
        </div>
        <div id="interstellar-preview-filename"></div>
    `;

    fileLabel.insertAdjacentElement("afterend", previewBox);

    const player = previewBox.querySelector(
        "#interstellar-preview-player"
    );
    const filename = previewBox.querySelector(
        "#interstellar-preview-filename"
    );
    const playButton = previewBox.querySelector(
        "#interstellar-preview-play-button"
    );

    playButton.addEventListener("click", async function () {
        try {
            await player.play();
        } catch (error) {
            filename.textContent = "Unable to play this video. Try another MP4 video.";
            console.error("Preview playback failed:", error);
        }
    });

    player.addEventListener("play", function () {
        playButton.hidden = true;
    });

    player.addEventListener("pause", function () {
        playButton.hidden = false;
    });

    player.addEventListener("ended", function () {
        playButton.hidden = false;
    });

    player.addEventListener("error", function () {
        playButton.hidden = false;
        filename.textContent = "This video format may not be supported. Try another MP4 video.";
    });

    let currentPreviewUrl = null;

    fileInput.addEventListener("change", function () {
        const file = fileInput.files && fileInput.files[0];

        if (currentPreviewUrl) {
            URL.revokeObjectURL(currentPreviewUrl);
            currentPreviewUrl = null;
        }

        player.pause();
        player.removeAttribute("src");
        player.load();

        if (!file) {
            previewBox.hidden = true;
            filename.textContent = "";
            return;
        }

        if (
            file.type &&
            !file.type.startsWith("video/") &&
            !file.name.toLowerCase().endsWith(".mp4")
        ) {
            previewBox.hidden = true;
            filename.textContent = "";
            return;
        }

        currentPreviewUrl = URL.createObjectURL(file);
        player.src = currentPreviewUrl;
        filename.textContent =
            file.name + " · " + (file.size / (1024 * 1024)).toFixed(1) + " MB";

        previewBox.hidden = false;

        player.autoplay = true;
        player.muted = true;
        player.defaultMuted = true;
        player.playsInline = true;

        player.addEventListener("canplay", function startPreview() {
            player.play().then(function () {
                if (playButton) playButton.hidden = true;
                console.log("INTERSTELLAR video autoplay started.");
            }).catch(function (error) {
                if (playButton) playButton.hidden = false;
                console.warn("Autoplay blocked by browser:", error.name, error.message);
                filename.textContent =
                    "Autoplay was blocked. Tap the gray play button to start.";
            });
        }, { once: true });

        player.load();

        console.log("INTERSTELLAR video preview ready:", file.name);
    });

    
/* =========================================
   NOTIFICATION COUNT AUTO-REFRESH
========================================= */
(function () {
    let notificationRefreshTimer = null;

    async function refreshNotificationCount() {
        if (typeof getAccessToken !== "function") return;
        if (typeof loadNotifications !== "function") return;
        if (!getAccessToken()) return;

        const page = document.getElementById("notifications-page");

        // Refresh the full list only while its page is open.
        // Otherwise update the badge quietly.
        if (page && page.classList.contains("active")) {
            await loadNotifications();
            return;
        }

        const badge = document.getElementById("notification-count");
        if (!badge) return;

        try {
            const response = await fetch(
                `${API_BASE_URL}/v1/notifications`,
                {
                    headers: {
                        Authorization: `Bearer ${getAccessToken()}`
                    }
                }
            );

            if (!response.ok) return;

            const result = await response.json();
            const count = Math.max(0, Number(result.unreadCount) || 0);

            badge.textContent = count > 99 ? "99+" : String(count);
            badge.style.display = count > 0 ? "inline-flex" : "none";
            badge.hidden = count === 0;
        } catch (error) {
            console.warn("Notification count refresh failed:", error);
        }
    }

    refreshNotificationCount();

    notificationRefreshTimer = setInterval(
        refreshNotificationCount,
        10000
    );

    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) refreshNotificationCount();
    });

    console.log("INTERSTELLAR NOTIFICATION AUTO-COUNT READY");
})();

console.log("INTERSTELLAR VIDEO FILE PREVIEW READY");
})();

/* =========================================
   INTERSTELLAR PRIVATE CHAT CONNECTION
========================================= */

(function () {
    const CHAT_API = "https://interstellar-backend-owfb.onrender.com";

    const peopleList = document.getElementById("chat-people-list");
    const searchInput = document.getElementById("chat-user-search");
    const messageList = document.getElementById("chat-message-list");
    const messageForm = document.getElementById("private-chat-form");
    const messageInput = document.getElementById("chat-message-input");
    const sendButton = document.getElementById("chat-send-button");
    const contactName = document.getElementById("chat-contact-name");
    const contactStatus = document.getElementById("chat-contact-status");
    const feedback = document.getElementById("chat-feedback");

    if (!peopleList || !searchInput || !messageList || !messageForm) {
        console.warn("INTERSTELLAR chat elements were not found.");
        return;
    }

    let people = [];
    let selectedPerson = null;
    let peopleLoaded = false;
    let peopleLoading = false;
    let conversationLoading = false;

    async function chatRequest(path, options) {
        const settings = options || {};
        const headers = Object.assign({}, settings.headers || {});
        const token = getAccessToken();

        if (!token) {
            throw new Error("Please sign in before using private messages.");
        }

        headers.Authorization = "Bearer " + token;

        if (settings.body) {
            headers["Content-Type"] = "application/json";
        }

        let response = await fetch(CHAT_API + path, {
            ...settings,
            headers: headers
        });

        if (response.status === 401) {
            const refreshedToken = await refreshAccessToken();
            headers.Authorization = "Bearer " + refreshedToken;

            response = await fetch(CHAT_API + path, {
                ...settings,
                headers: headers
            });
        }

        const result = await response.json().catch(function () {
            return {};
        });

        if (!response.ok) {
            throw new Error(
                result.error?.message ||
                result.message ||
                "Chat request failed (" + response.status + ")."
            );
        }

        return result;
    }

    function showChatFeedback(message) {
        feedback.textContent = message || "";
    }

    function renderPeople() {
        const query = searchInput.value.trim().toLowerCase();

        const matches = people.filter(function (person) {
            const name = person.displayName || "";
            const username = person.username || "";

            return (
                name.toLowerCase().includes(query) ||
                username.toLowerCase().includes(query)
            );
        });

        const fragment = document.createDocumentFragment();

        if (!matches.length) {
            const empty = document.createElement("p");
            empty.className = "chat-empty";
            empty.textContent = query
                ? "No people match your search."
                : "No people are available to message yet.";
            fragment.appendChild(empty);
        }

        matches.forEach(function (person) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "chat-person-button";
            button.style.cssText =
                "display:flex;align-items:center;gap:10px;width:100%;" +
                "padding:12px;border:1px solid #30264b;border-radius:12px;" +
                "background:#171225;color:#fff;text-align:left;cursor:pointer;";

            const avatar = document.createElement("span");
            avatar.style.cssText =
                "display:flex;align-items:center;justify-content:center;" +
                "width:38px;height:38px;flex-shrink:0;border-radius:50%;" +
                "background:#5735a0;color:white;font-weight:bold;overflow:hidden;";

            if (person.profilePhotoUrl) {
                const image = document.createElement("img");
                image.src = person.profilePhotoUrl;
                image.alt = "";
                image.style.cssText =
                    "width:100%;height:100%;object-fit:cover;";
                image.onerror = function () {
                    image.remove();
                    avatar.textContent =
                        (person.displayName || person.username || "U")
                            .charAt(0).toUpperCase();
                };
                avatar.appendChild(image);
            } else {
                avatar.textContent =
                    (person.displayName || person.username || "U")
                        .charAt(0).toUpperCase();
            }

            const details = document.createElement("span");
            details.style.cssText =
                "display:flex;flex-direction:column;gap:4px;min-width:0;";

            const name = document.createElement("strong");
            name.textContent =
                person.displayName || person.username || "INTERSTELLAR User";

            const username = document.createElement("small");
            username.style.color = "#b7a8d5";
            username.textContent = person.username
                ? "@" + person.username
                : "INTERSTELLAR member";

            details.append(name, username);
            button.append(avatar, details);

            if (selectedPerson && selectedPerson.userId === person.userId) {
                button.style.borderColor = "#a78bfa";
            }

            button.addEventListener("click", function () {
                openConversation(person);
            });

            fragment.appendChild(button);
        });

        peopleList.replaceChildren(fragment);
    }

    async function loadChatPeople(forceReload) {
        if (peopleLoading) return;

        if (peopleLoaded && !forceReload) {
            renderPeople();
            return;
        }

        peopleLoading = true;
        peopleList.textContent = "Loading people...";
        showChatFeedback("");

        try {
            const result = await chatRequest("/v1/discover/users");
            people = Array.isArray(result.users) ? result.users : [];
            peopleLoaded = true;
            renderPeople();
        } catch (error) {
            console.error("PRIVATE CHAT PEOPLE ERROR:", error);
            peopleList.textContent = error.message;
        } finally {
            peopleLoading = false;
        }
    }

    function renderConversation(messages) {
        const currentUserId = getCurrentUserId();
        const fragment = document.createDocumentFragment();

        if (!messages.length) {
            const empty = document.createElement("p");
            empty.className = "chat-empty";
            empty.textContent = "No messages yet. Say hello!";
            fragment.appendChild(empty);
        }

        messages.forEach(function (message) {
            const bubble = document.createElement("div");
            const ownMessage = message.senderId === currentUserId;

            bubble.className =
                "chat-message-bubble" +
                (ownMessage ? " own-message" : "");

            const content = document.createElement("div");
            content.textContent = message.content || "";
            bubble.appendChild(content);

            const time = document.createElement("small");
            time.className = "chat-message-time";

            const date = new Date(message.createdAt);
            time.textContent = Number.isNaN(date.getTime())
                ? ""
                : date.toLocaleString();

            bubble.appendChild(time);
            fragment.appendChild(bubble);
        });

        messageList.replaceChildren(fragment);
        messageList.scrollTop = messageList.scrollHeight;
    }

    async function openConversation(person) {
        if (conversationLoading) return;

        selectedPerson = person;
        conversationLoading = true;
        messageInput.disabled = true;
        sendButton.disabled = true;

        contactName.textContent =
            person.displayName || person.username || "INTERSTELLAR User";
        contactStatus.textContent = person.username
            ? "@" + person.username
            : "Private conversation";

        messageList.textContent = "Loading conversation...";
        showChatFeedback("");
        renderPeople();

        try {
            const result = await chatRequest(
                "/v1/messages/" + encodeURIComponent(person.userId)
            );

            if (!selectedPerson ||
                selectedPerson.userId !== person.userId) {
                return;
            }

            renderConversation(
                Array.isArray(result.messages) ? result.messages : []
            );

            messageInput.disabled = false;
            sendButton.disabled = false;
            messageInput.focus();
        } catch (error) {
            console.error("PRIVATE CHAT CONVERSATION ERROR:", error);
            messageList.textContent = error.message;
            showChatFeedback(error.message);
        } finally {
            conversationLoading = false;
        }
    }

    messageForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!selectedPerson) {
            showChatFeedback("Choose someone to message first.");
            return;
        }

        const content = messageInput.value.trim();

        if (!content) return;

        if (content.length > 5000) {
            showChatFeedback("Messages must be 5000 characters or fewer.");
            return;
        }

        const recipientId = selectedPerson.userId;
        sendButton.disabled = true;
        showChatFeedback("Sending...");

        try {
            await chatRequest("/v1/messages", {
                method: "POST",
                body: JSON.stringify({
                    recipient_id: recipientId,
                    content: content
                })
            });

            messageInput.value = "";
            await openConversation(selectedPerson);
            showChatFeedback("Message sent.");
        } catch (error) {
            console.error("PRIVATE CHAT SEND ERROR:", error);
            showChatFeedback(error.message);
        } finally {
            sendButton.disabled = !selectedPerson;
        }
    });

    searchInput.addEventListener("input", renderPeople);

    const messagesNav = document.querySelector(
        '#bottom-nav button[data-page="messages-page"]'
    );

    if (messagesNav) {
        messagesNav.addEventListener("click", function () {
            loadChatPeople();
        });
    }

    console.log("INTERSTELLAR PRIVATE CHAT READY");
})();
