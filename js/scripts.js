console.log('Lets write JavaScript');
let currentSong = new Audio();
let songs;
let currFolder;

function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');
    return `${formattedMinutes}:${formattedSeconds}`;
}

async function fetchWithErrorHandling(url) {
    try {
        console.log(`Fetching URL: ${url}`);
        let response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response;
    } catch (error) {
        console.error("Fetch error:", error);
        return null;
    }
}

async function getSongs(folder) {
    currFolder = folder;
    let a = await fetchWithErrorHandling(`/${folder}/`);
    if (!a) return [];
    let response = await a.text();
    let div = document.createElement("div");
    div.innerHTML = response;
    let as = div.getElementsByTagName("a");
    songs = [];
    for (let index = 0; index < as.length; index++) {
        const element = as[index];
        if (element.href.endsWith(".mp3")) {
            songs.push(element.href.split(`/${folder}/`)[1]);
        }
    }

    // Show all the songs in the playlist
    let songUL = document.querySelector(".songList").getElementsByTagName("ul")[0];
    if (songUL) {
        let songListHTML = songs.map(song => `
            <li>
                <img class="invert" width="34" src="img/music.svg" alt="">
                <div class="info">
                    <div>${song.replaceAll("%20", " ")}</div>
                    <div>Priyanshu</div>
                </div>
                <div class="playnow">
                    <span>Play Now</span>
                    <img class="invert" src="img/play.svg" alt="">
                </div>
            </li>
        `).join("");
        songUL.innerHTML = songListHTML;

        // Attach an event listener to each song
        Array.from(songUL.getElementsByTagName("li")).forEach(e => {
            e.addEventListener("click", () => {
                playMusic(e.querySelector(".info").firstElementChild.innerHTML.trim());
            });
        });
    } else {
        console.error('Element with class "songList" not found.');
    }

    return songs;
}

const playMusic = (track, pause = false) => {
    if (!track) return;
    currentSong.src = `/${currFolder}/` + track;
    if (!pause) {
        currentSong.play();
        document.querySelector("#play").src = "img/pause.svg";
    }
    document.querySelector(".songinfo").innerHTML = decodeURI(track);
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
}


async function displayAlbums() {
    console.log("Displaying albums");
    let a = await fetchWithErrorHandling(`/songs`);
    if (!a) return;
    let response = await a.text();
    let div = document.createElement("div");
    div.innerHTML = response;
    let anchors = div.getElementsByTagName("a");
    let cardContainer = document.querySelector(".cardContainer");
    
    if (cardContainer) {
        let array = Array.from(anchors);
        for (let index = 0; index < array.length; index++) {
            const e = array[index];
            if (e.href && e.href.includes("/songs")) {
                let folder = e.href.split("/songs/")[1]?.split("/")[0];
                if (!folder) {
                    console.error(`Invalid folder path in href: ${e.href}`);
                    continue;
                }

                // Get the metadata of the folder
                let metadata = await fetchWithErrorHandling(`/songs/${folder}/info.json`);
                if (!metadata) continue;
                let response = await metadata.json();
                
                cardContainer.innerHTML += `
                    <div data-folder="${folder}" class="card">
                        <div class="play">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5" stroke-linejoin="round" />
                            </svg>
                        </div>
                        <img src="/songs/${folder}/cover.jpg" alt="">
                        <h2>${response.title}</h2>
                        <p>${response.description}</p>
                    </div>
                `;
            } else {
                console.error("Invalid anchor element or href missing:", e);
            }
        }

        // Load the playlist whenever a card is clicked
        Array.from(document.getElementsByClassName("card")).forEach(e => {
            e.addEventListener("click", async item => {
                console.log("Fetching Songs");
                songs = await getSongs(`songs/${item.currentTarget.dataset.folder}`);
                playMusic(songs[0]);
            });
        });
    } else {
        console.error('Element with class "cardContainer" not found.');
    }
}

async function main() {
    // Get the list of all the songs
    // Get the list of all the songs
    songs = await getSongs("songs/ncs");
    if (songs.length > 0) {
        playMusic(songs[0], true);
    } else {
        console.error("No songs found in the folder.");
    }

    // Display all the albums on the page
    await displayAlbums();

    // Attach an event listener to play, next, and previous
    const play = document.querySelector("#play");
    const previous = document.querySelector("#previous");
    const next = document.querySelector("#next");

    if (play && previous && next) {
        play.addEventListener("click", () => {
            if (currentSong.paused) {
                currentSong.play();
                play.src = "img/pause.svg";
            } else {
                currentSong.pause();
                play.src = "img/play.svg";
            }
        });

        // Add an event listener to previous
        previous.addEventListener("click", () => {
            currentSong.pause();
            console.log("Previous clicked");
            let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0]);
            if ((index - 1) >= 0) {
                playMusic(songs[index - 1]);
            }
        });

        // Add an event listener to next
        next.addEventListener("click", () => {
            currentSong.pause();
            console.log("Next clicked");
            let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0]);
            if ((index + 1) < songs.length) {
                playMusic(songs[index + 1]);
            }
        });
    }

    // Listen for timeupdate event
    currentSong.addEventListener("timeupdate", () => {
        document.querySelector(".songtime").innerHTML = `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
        document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
    });

    // Add an event listener to seekbar
    document.querySelector(".seekbar").addEventListener("click", e => {
        let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
        document.querySelector(".circle").style.left = percent + "%";
        currentSong.currentTime = (currentSong.duration * percent) / 100;
    });

    // Add an event listener for hamburger
    const left = document.querySelector(".left");
    const close = document.querySelector(".close");
    const hamburger = document.querySelector(".hamburger");

    if (left && close && hamburger) {
        hamburger.addEventListener("click", () => {
            left.style.left = "0";
        });

        close.addEventListener("click", () => {
            left.style.left = "-120%";
        });
    }

    // Add an event to volume
    document.querySelector(".range>input").addEventListener("change", e => {
        console.log("Setting volume to", e.target.value, "/ 100");
        currentSong.volume = parseInt(e.target.value) / 100;
        if (currentSong.volume > 0) {
            document.querySelector(".volume>img").src = document.querySelector(".volume>img").src.replace("mute.svg", "volume.svg");
        }
    });

    // Add event listener to mute the track
    document.querySelector(".volume>img").addEventListener("click", e => {
        if (e.target.src.includes("volume.svg")) {
            e.target.src = e.target.src.replace("volume.svg", "mute.svg");
            currentSong.volume = 0;
            document.querySelector(".range>input").value = 0;
        } else {
            e.target.src = e.target.src.replace("mute.svg", "volume.svg");
            currentSong.volume = 0.1;
            document.querySelector(".range>input").value = 10;
        }
    });
}

main();
