// React & State-Management
import React, { useState, useEffect } from 'react'
// Hook für Debouncing (verzögert die Suchanfrage)
import { useDebounce } from 'react-use'

// Komponenten für UI
import Search from './components/Search'
import Spinner from './components/spinner'
import MovieCard from './components/MovieCard'

// Funktionen, die mit Appwrite interagieren
import { getTrendingMovies, updateSearchCount } from './appwrite'

// TMDB API-Konfiguration
const API_BASE_URL = 'https://api.themoviedb.org/3'
const API_KEY = import.meta.env.VITE_TMDB_API_KEY
const API_OPTIONS = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${API_KEY}`
  }
}

const App = () => {
  // State-Variablen für Suchbegriff, Fehlermeldungen etc.
  const [searchTerm, setSearchTerm] = useState("")
  const [errorMessage, setErrorMessage] = useState(null)
  const [movieList, setMovieList] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [debounceSearchTerm, setDebounceSearchTerm] = useState('')
  const [trendingMovies, setTrendingMovies] = useState([])

  // Verzögert die Suche um 1 Sekunde nach der letzten Eingabe
  useDebounce(() => setDebounceSearchTerm(searchTerm), 1000, [searchTerm])

  // Holt entweder beliebte Filme oder Suchergebnisse von TMDB
  const fetchMovies = async (query = '') => {
    setIsLoading(true)
    setErrorMessage('')
    
    try {
      // Endpunkt je nach Suchbegriff
      const endpoint = query
        ? `${API_BASE_URL}/search/movie?query=${encodeURI(query)}`
        : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc`

      const response = await fetch(endpoint, API_OPTIONS)
      if (!response.ok) {
        throw new Error('Failed to fetch movies')
      }

      const data = await response.json()
      if (data.Response) {
        setErrorMessage(data.Error || 'Failed to fetch movies')
        setMovieList([])
        return
      }

      setMovieList(data.results || [])

      // Wenn ein Suchbegriff verwendet wurde, wird die Suche gezählt (Appwrite)
      if (query && data.results.length > 0) {
        await updateSearchCount(query, data.results[0])
      }
    } catch (error) {
      console.log(`Error fetching movies: ${error}`)
      setErrorMessage('Error fetching movies. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  // Holt die beliebtesten Filme aus Appwrite (z. B. durch Suchzählungen)
  const loadTrendingMovies = async () => {
    try {
      const movies = await getTrendingMovies()
      setTrendingMovies(movies)
    } catch (error) {
      console.error(`Error fetching trending movies: ${error}`)
    }
  }

  // Wird aufgerufen, wenn sich der (debouncte) Suchbegriff ändert
  useEffect(() => {
    fetchMovies(debounceSearchTerm)
  }, [debounceSearchTerm])

  // Lädt die Trends beim ersten Rendern
  useEffect(() => {
    loadTrendingMovies()
  }, [])

  // JSX: Aufbau des UI mit hero-banner, Suchfeld, Trending-Liste und Suchergebnissen
  return (
    <main>
      <div className="pattern" />
      <div className="wrapper">
        <header>
          <img src="/hero.png" alt="Hero banner" />
          <h1>Find <span className='text-gradient'>Movies</span> You'll Enjoy Without the Hassle</h1>
          <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </header>

        {trendingMovies.length > 0 && (
          <section className="trending">
            <h2>Trending Movies</h2>
            <ul>
              {trendingMovies.map((movie, index) => (
                <li key={movie.$id}>
                  <p>{index + 1}</p>
                  <img src={movie.poster_url} alt={movie.titel} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="all-movies">
          <h2>All Movies</h2>
          {isLoading ? (
            <Spinner />
          ) : errorMessage ? (
            <p className="text-red-500">{errorMessage}</p>
          ) : (
            <ul>
              {movieList.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}

export default App