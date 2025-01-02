// scripts/main.js

const GITHUB_USERNAME = 'damedotblog'; // Your GitHub username
const GITHUB_REPO = 'dame.is'; // Your repository name
const GITHUB_BRANCH = 'main'; // Your branch name

// Create a Promise that resolves when marked.js is loaded
const markedLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
    script.onload = () => {
        console.log('Marked.js loaded successfully.');
        resolve();
    };
    script.onerror = () => {
        console.error('Failed to load marked.js.');
        reject(new Error('marked.js failed to load.'));
    };
    document.head.appendChild(script);
});

// Function to load HTML components
function loadComponent(id, url) {
    fetch(url)
        .then(response => response.text())
        .then(data => {
            document.getElementById(id).innerHTML = data;
            if (id === 'nav') {
                initializeNav();
            }
            if (id === 'footer') {
                initializeFooter();
            }
        })
        .catch(err => console.error(`Error loading ${url}:`, err));
}

// Load navigation and footer
document.addEventListener('DOMContentLoaded', () => {
    loadComponent('nav', 'components/nav.html');
    loadComponent('footer', 'components/footer.html');

    // If on index.html, load recent posts
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        loadRecentPosts();
    }

    // If on about.html or ethos.html, load Markdown content
    if (window.location.pathname.endsWith('about.html') || window.location.pathname.endsWith('ethos.html')) {
        loadMarkdownContent();
    }
});

// Initialize Navigation functionalities
function initializeNav() {
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', toggleTheme);
    // Set initial theme based on localStorage
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = 'light mode';
    } else {
        themeToggle.textContent = 'dark mode';
    }

    // Fetch Bluesky stats
    fetchBlueskyStats();

    // Assign active class to current page link
    setActiveNavLink();
}

// Toggle Dark/Light Mode
function toggleTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
        themeToggle.textContent = 'light mode';
        localStorage.setItem('theme', 'dark');
    } else {
        themeToggle.textContent = 'dark mode';
        localStorage.setItem('theme', 'light');
    }
}

// Fetch Bluesky Stats
async function fetchBlueskyStats() {
    const actor = 'did:plc:gq4fo3u6tqzzdkjlwzpb23tj'; // Your actual actor identifier
    const apiUrl = `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor)}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        document.getElementById('followers').textContent = data.followersCount;
        document.getElementById('following').textContent = data.followsCount;
        document.getElementById('posts').textContent = data.postsCount;
    } catch (error) {
        console.error('Error fetching Bluesky stats:', error);
    }
}

// Initialize Footer functionalities
function initializeFooter() {
    // Set version number and last updated
    fetchFooterData();
}

// Fetch Footer Data (Version and Last Updated)
async function fetchFooterData() {
    const apiUrlTags = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/tags`;
    const apiUrlCommits = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/commits/${GITHUB_BRANCH}`;
    const apiUrlLastUpdated = 'last-updated.json'; // Path to the JSON file

    try {
        // Fetch the latest tag
        const responseTags = await fetch(apiUrlTags);
        if (!responseTags.ok) throw new Error(`GitHub Tags API error: ${responseTags.status}`);
        const tagsData = await responseTags.json();

        let version = 'No Tags';
        let lastUpdated = 'N/A';

        if (tagsData.length > 0) {
            // Assuming the tags are returned in descending order
            version = tagsData[0].name;
            // Fetch commit details for the latest tag
            const commitSha = tagsData[0].commit.sha;
            const apiUrlTagCommit = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/commits/${commitSha}`;
            const responseTagCommit = await fetch(apiUrlTagCommit);
            if (responseTagCommit.ok) {
                const tagCommitData = await responseTagCommit.json();
                const commitDate = new Date(tagCommitData.commit.committer.date);
                const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
                lastUpdated = commitDate.toLocaleDateString(undefined, options);
            }
        } else {
            // If no tags exist, fallback to the latest commit
            const responseCommits = await fetch(apiUrlCommits);
            if (!responseCommits.ok) throw new Error(`GitHub Commits API error: ${responseCommits.status}`);
            const commitsData = await responseCommits.json();
            const latestCommit = commitsData;
            version = latestCommit.sha.substring(0, 7); // Short SHA for version
            const commitDate = new Date(latestCommit.commit.committer.date);
            const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            lastUpdated = commitDate.toLocaleDateString(undefined, options);
        }

        // Fetch last-updated.json
        const responseLastUpdated = await fetch(apiUrlLastUpdated);
        if (!responseLastUpdated.ok) throw new Error(`Failed to fetch last-updated.json: ${responseLastUpdated.status}`);
        const lastUpdatedData = await responseLastUpdated.json();

        // Determine the current page
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        // Get the last updated date for the current page
        const pageLastUpdatedISO = lastUpdatedData[currentPage];
        let pageLastUpdated = 'N/A';
        if (pageLastUpdatedISO) {
            const date = new Date(pageLastUpdatedISO);
            pageLastUpdated = date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        }

        // Update the footer elements
        document.getElementById('version').textContent = version;
        document.getElementById('last-updated').textContent = pageLastUpdated;
    } catch (error) {
        console.error('Error fetching footer data:', error);
        document.getElementById('version').textContent = 'N/A';
        document.getElementById('last-updated').textContent = 'N/A';
    }
}

// Load Recent Posts on Home Page
async function loadRecentPosts() {
    const actor = 'did:plc:gq4fo3u6tqzzdkjlwzpb23tj'; // Your actual actor identifier
    const apiUrl = `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(actor)}&limit=10&filter=posts_no_replies`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        const postsList = document.getElementById('recent-posts');

        // Clear any existing content
        postsList.innerHTML = '';

        data.feed.forEach(item => {
            const post = item.post; // Access the 'post' object

            // Ensure 'post' and 'record' exist
            if (post && post.record) {
                // Create a container for each post
                const postContainer = document.createElement('div');
                postContainer.classList.add('post');

                // Post Text
                const postText = document.createElement('p');
                postText.classList.add('post-text');
                postText.textContent = post.record.text || '[No content]';
                postContainer.appendChild(postText);

                // Created At with Bluesky Link
                const postDate = document.createElement('p');
                postDate.classList.add('post-date');

                // Extract the Post ID from the URI
                const uri = post.uri; // e.g., "at://did:plc:gq4fo3u6tqzzdkjlwzpb23tj/app.bsky.feed.post/3lep2fdto622v"
                if (uri) {
                    const postId = uri.split('/').pop(); // Extracts "3lep2fdto622v"

                    // Construct the Bluesky URL
                    const blueskyUrl = `https://bsky.app/profile/dame.bsky.social/post/${postId}`;

                    // Format the Date
                    const date = new Date(post.record.createdAt || Date.now());
                    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
                    const formattedDate = date.toLocaleDateString(undefined, options);

                    // Create the link element
                    const dateLink = document.createElement('a');
                    dateLink.href = blueskyUrl;
                    dateLink.textContent = formattedDate;
                    dateLink.target = '_blank'; // Opens the link in a new tab
                    dateLink.rel = 'noopener noreferrer'; // Security best practices

                    // Append "Posted on" text and the link
                    postDate.textContent = 'Posted on ';
                    postDate.appendChild(dateLink);
                } else {
                    // Handle posts without a URI
                    const date = new Date(post.record.createdAt || Date.now());
                    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
                    const formattedDate = date.toLocaleDateString(undefined, options);
                    postDate.textContent = `Posted on ${formattedDate}`;
                }

                postContainer.appendChild(postDate);

                // Counts Container
                const countsContainer = document.createElement('div');
                countsContainer.classList.add('post-counts');

                // Reply Count
                const replyCount = document.createElement('span');
                replyCount.textContent = `${post.replyCount || 0} replies`;
                countsContainer.appendChild(replyCount);

                // Quote Count
                const quoteCount = document.createElement('span');
                quoteCount.textContent = `${post.quoteCount || 0} quotes`;
                countsContainer.appendChild(quoteCount);

                // Repost Count
                const repostCount = document.createElement('span');
                repostCount.textContent = `${post.repostCount || 0} reposts`;
                countsContainer.appendChild(repostCount);

                // Like Count
                const likeCount = document.createElement('span');
                likeCount.textContent = `${post.likeCount || 0} likes`;
                countsContainer.appendChild(likeCount);

                postContainer.appendChild(countsContainer);

                // Append the post to the list
                postsList.appendChild(postContainer);
            } else {
                console.warn('Post or record missing in the feed item:', item);
            }
        });
    } catch (error) {
        console.error('Error fetching recent posts:', error);
        const postsList = document.getElementById('recent-posts');
        postsList.innerHTML = '<p>Failed to load posts. Please try again later.</p>';
    }
}

// Load Markdown Content for About and Ethos Pages
async function loadMarkdownContent() {
    try {
        // Wait until marked.js is loaded
        await markedLoadPromise;

        const path = window.location.pathname.endsWith('about.html') ? 'about.md' : 'ethos.md';
        const response = await fetch(path);
        if (!response.ok) throw new Error('Network response was not ok');
        const markdown = await response.text();
        const htmlContent = marked.parse(markdown);
        document.getElementById(`${path.split('.')[0]}-content`).innerHTML = htmlContent;
    } catch (error) {
        console.error('Error loading Markdown content:', error);
    }
}

// Function to Set Active Navigation Link
function setActiveNavLink() {
    // Get the current page's path
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    // Get all navigation links
    const navLinks = document.querySelectorAll('.nav-left .nav-link');

    navLinks.forEach(link => {
        // Get the href attribute of the link
        const linkPath = link.getAttribute('href');

        // Compare linkPath with currentPath
        if (linkPath === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}
