import React, { useState, useRef, useEffect } from 'react';
import './MusicPlayer.css';

const API_BASE_URL = 'https://browseros-aos.onrender.com'; // Add this at the top

const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playlist, setPlaylist] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('none'); // none, one, all

  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const isChangingTrack = useRef(false); // Add this to track track changes

  // Add new state for Music folder
  const [musicFolderPath, setMusicFolderPath] = useState('Music');

  // Load playlist from localStorage on component mount
  useEffect(() => {
    const savedPlaylist = localStorage.getItem('musicPlayerPlaylist');
    if (savedPlaylist) {
      setPlaylist(JSON.parse(savedPlaylist));
    }
  }, []);

  // Save playlist to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('musicPlayerPlaylist', JSON.stringify(playlist));
  }, [playlist]);

  // Create Music folder on component mount
  useEffect(() => {
    const createMusicFolder = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/fs/create-music-folder`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.path) {
          setMusicFolderPath(data.path);
          // Load music from the Music folder
          await loadMusicFromFolder();
        }
      } catch (error) {
        console.error('Error creating Music folder:', error);
      }
    };

    createMusicFolder();
  }, []);

  // Load music from Music folder
  const loadMusicFromFolder = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/fs/list?path=${encodeURIComponent(musicFolderPath)}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.items) {
        const musicFiles = data.items
          .filter(item => item.type === 'file' && item.name.match(/\.(mp3|wav|ogg|m4a)$/i))
          .map(item => ({
            id: Date.now() + Math.random(),
            name: item.name,
            url: `${API_BASE_URL}/api/fs/download?path=${encodeURIComponent(musicFolderPath)}&filename=${encodeURIComponent(item.name)}`,
            path: `${musicFolderPath}/${item.name}`
          }));
        
        setPlaylist(musicFiles);
        if (musicFiles.length > 0 && !currentTrack) {
          setCurrentTrack(musicFiles[0]);
        }
      }
    } catch (error) {
      console.error('Error loading music from folder:', error);
    }
  };

  // Modify handleFileUpload to save files to Music folder
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    for (const file of files) {
      if (!file.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
        console.error('Invalid file type:', file.name);
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${API_BASE_URL}/api/fs/upload?path=${encodeURIComponent(musicFolderPath)}`, {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.file) {
          const newTrack = {
            id: Date.now() + Math.random(),
            name: data.file.name,
            url: `${API_BASE_URL}/api/fs/download?path=${encodeURIComponent(musicFolderPath)}&filename=${encodeURIComponent(data.file.name)}`,
            path: `${musicFolderPath}/${data.file.name}`
          };

          setPlaylist(prev => [...prev, newTrack]);
          if (!currentTrack) {
            setCurrentTrack(newTrack);
          }
        }
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }
  };

  // Modify handleOpenMusicFile to use Music folder
  useEffect(() => {
    const handleOpenMusicFile = (event) => {
      const { name, path } = event.detail;
      const fileUrl = `${API_BASE_URL}/api/fs/download?path=${encodeURIComponent(musicFolderPath)}&filename=${encodeURIComponent(name)}`;
      
      // Add the file to the playlist if it's not already there
      const fileExists = playlist.some(track => track.name === name);
      if (!fileExists) {
        const newTrack = {
          name,
          url: fileUrl,
          path: `${musicFolderPath}/${name}`
        };
        setPlaylist(prev => [...prev, newTrack]);
        setCurrentTrack(newTrack);
        audioRef.current.src = fileUrl;
        audioRef.current.play();
      } else {
        // If file exists, just play it
        const trackIndex = playlist.findIndex(track => track.name === name);
        setCurrentTrack(playlist[trackIndex]);
        audioRef.current.src = fileUrl;
        audioRef.current.play();
      }
    };

    window.addEventListener('openMusicFile', handleOpenMusicFile);
    return () => {
      window.removeEventListener('openMusicFile', handleOpenMusicFile);
    };
  }, [playlist, musicFolderPath]);

  // Add cleanup effect
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Add effect to handle track changes
  useEffect(() => {
    if (currentTrack && audioRef.current && !isChangingTrack.current) {
      isChangingTrack.current = true;
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            isChangingTrack.current = false;
          })
          .catch(error => {
            console.error('Error playing track:', error);
            setIsPlaying(false);
            isChangingTrack.current = false;
          });
      }
    }
  }, [currentTrack]);

  // Handle time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Handle loaded metadata
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Handle progress bar click
  const handleProgressClick = (e) => {
    if (audioRef.current && progressRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      audioRef.current.currentTime = pos * duration;
    }
  };

  // Handle volume change
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  // Handle mute toggle
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Modify changeTrack function
  const changeTrack = async (direction) => {
    if (!playlist.length || isChangingTrack.current) return;

    try {
      const currentIndex = playlist.findIndex(track => track.id === currentTrack?.id);
      let newIndex;

      if (direction === 'next') {
        newIndex = (currentIndex + 1) % playlist.length;
      } else {
        newIndex = (currentIndex - 1 + playlist.length) % playlist.length;
      }

      const nextTrack = playlist[newIndex];
      isChangingTrack.current = true;
      setCurrentTrack(nextTrack);
      audioRef.current.src = nextTrack.url;
      await audioRef.current.play();
      setIsPlaying(true);
      isChangingTrack.current = false;
    } catch (error) {
      console.error('Error changing track:', error);
      setIsPlaying(false);
      isChangingTrack.current = false;
    }
  };

  // Modify togglePlay
  const togglePlay = async () => {
    if (audioRef.current && !isChangingTrack.current) {
      try {
        if (isPlaying) {
          await audioRef.current.pause();
        } else {
          await audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
      } catch (error) {
        console.error('Error toggling play:', error);
        setIsPlaying(false);
      }
    }
  };

  // Modify handleTrackEnd
  const handleTrackEnd = async () => {
    if (!playlist.length || isChangingTrack.current) return;

    try {
      if (repeatMode === 'one') {
        // Replay current track
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
      } else if (repeatMode === 'all' || isShuffle) {
        // For repeat all or shuffle mode, play next track
        let nextTrack;
        if (isShuffle) {
          // Get a random track that's not the current one
          let randomIndex;
          do {
            randomIndex = Math.floor(Math.random() * playlist.length);
          } while (randomIndex === playlist.findIndex(track => track.id === currentTrack?.id));
          nextTrack = playlist[randomIndex];
        } else {
          // Get next track in sequence
          const currentIndex = playlist.findIndex(track => track.id === currentTrack?.id);
          const nextIndex = (currentIndex + 1) % playlist.length;
          nextTrack = playlist[nextIndex];
        }
        
        isChangingTrack.current = true;
        setCurrentTrack(nextTrack);
        audioRef.current.src = nextTrack.url;
        await audioRef.current.play();
        setIsPlaying(true);
        isChangingTrack.current = false;
      } else {
        // Normal mode - play next track if not at the end
        const currentIndex = playlist.findIndex(track => track.id === currentTrack?.id);
        if (currentIndex < playlist.length - 1) {
          const nextTrack = playlist[currentIndex + 1];
          isChangingTrack.current = true;
          setCurrentTrack(nextTrack);
          audioRef.current.src = nextTrack.url;
          await audioRef.current.play();
          setIsPlaying(true);
          isChangingTrack.current = false;
        } else {
          // End of playlist reached
          setIsPlaying(false);
          setCurrentTime(0);
        }
      }
    } catch (error) {
      console.error('Error in handleTrackEnd:', error);
      setIsPlaying(false);
      isChangingTrack.current = false;
    }
  };

  // Format time
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="music-player">
      <div className="player-header">
        <h2>Music Player</h2>
        <div className="upload-section">
          <label className="upload-button">
            <i className="fas fa-plus"></i> Add Music
            <input
              type="file"
              accept="audio/*"
              multiple
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      <div className="player-main">
        <div className="playlist-section">
          <h3>Playlist</h3>
          <div className="playlist">
            {playlist.map((track) => (
              <div
                key={track.id}
                className={`playlist-item ${currentTrack?.id === track.id ? 'active' : ''}`}
                onClick={() => {
                  setCurrentTrack(track);
                  if (isPlaying) {
                    audioRef.current.play();
                  }
                }}
              >
                <i className="fas fa-music"></i>
                <span className="track-name">{track.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="player-controls">
          <div className="now-playing">
            {currentTrack ? (
              <>
                <div className="track-info">
                  <i className="fas fa-music"></i>
                  <span>{currentTrack.name}</span>
                </div>
                <div className="progress-bar" ref={progressRef} onClick={handleProgressClick}>
                  <div
                    className="progress"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  ></div>
                </div>
                <div className="time-info">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </>
            ) : (
              <div className="no-track">No track selected</div>
            )}
          </div>

          <div className="control-buttons">
            <button onClick={() => setIsShuffle(!isShuffle)} className={isShuffle ? 'active' : ''}>
              <i className="fas fa-random"></i>
            </button>
            <button onClick={() => changeTrack('prev')}>
              <i className="fas fa-step-backward"></i>
            </button>
            <button className="play-button" onClick={togglePlay}>
              <i className={`fas fa-${isPlaying ? 'pause' : 'play'}`}></i>
            </button>
            <button onClick={() => changeTrack('next')}>
              <i className="fas fa-step-forward"></i>
            </button>
            <button
              onClick={() => setRepeatMode(repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none')}
              className={repeatMode !== 'none' ? 'active' : ''}
            >
              <i className={`fas fa-${repeatMode === 'one' ? 'repeat-1' : 'repeat'}`}></i>
            </button>
          </div>

          <div className="volume-control">
            <button onClick={toggleMute}>
              <i className={`fas fa-volume-${isMuted ? 'mute' : volume > 0.5 ? 'up' : 'down'}`}></i>
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="volume-slider"
            />
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={currentTrack?.url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleTrackEnd}
      />
    </div>
  );
};

export default MusicPlayer;
