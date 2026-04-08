import { useState, useEffect } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_KEY = import.meta.env.VITE_API_KEY || 'changeme'

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
}

function App() {
  const [productLines, setProductLines] = useState([{ product: '', quantity: '' }])
  const [department, setDepartment] = useState('')
  const [produits, setProduits] = useState([])
  const [result, setResult] = useState(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  // Charger la liste des produits au démarrage
  useEffect(() => {
    fetch(`${API_URL}/api/produits`, { headers })
      .then(r => r.json())
      .then(data => {
        setProduits(data.produits || [])
        setLoading(false)
      })
      .catch(() => {
        setError('Impossible de contacter le serveur')
        setLoading(false)
      })
  }, [])

  const addLine = () => {
    if (productLines.length < 4)
      setProductLines([...productLines, { product: '', quantity: '' }])
  }

  const removeLine = (i) =>
    setProductLines(productLines.filter((_, idx) => idx !== i))

  const updateLine = (i, field, value) => {
    const lines = [...productLines]
    lines[i][field] = value
    setProductLines(lines)
  }

  const calculer = async () => {
    setError(null)
    setResult(null)
    const dept = parseInt(department)
    if (isNaN(dept) || dept < 1 || dept > 95) {
      setError('Département invalide (1-95)')
      return
    }
    const lignes = productLines
      .filter(l => l.product && parseInt(l.quantity) > 0)
      .map(l => ({ produit: l.product, quantite: parseInt(l.quantity) }))
    if (!lignes.length) {
      setError('Sélectionnez au moins un produit avec une quantité')
      return
    }

    setIsCalculating(true)
    try {
      const res = await fetch(`${API_URL}/api/calcul`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ lignes, departement: dept }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Erreur serveur')
      }
      setResult(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setIsCalculating(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="spinner-large" />
          <h2>Connexion au serveur…</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="header">
        <h1 className="title">Calculateur de Transport EHS</h1>
      </div>

      <div className="main-content">
        {/* ── Panneau gauche ── */}
        <div className="left-panel">
          <div className="card">
            <div className="section-title">📋 Produits à expédier</div>
            <div className="card-content">
              {productLines.map((line, i) => (
                <div key={i} className="product-line">
                  <select
                    className="select"
                    value={line.product}
                    onChange={e => updateLine(i, 'product', e.target.value)}
                  >
                    <option value="">Sélectionner un produit</option>
                    {produits.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="input"
                    placeholder="Quantité"
                    value={line.quantity}
                    onChange={e => updateLine(i, 'quantity', e.target.value)}
                  />
                  {i > 0 && (
                    <button className="btn btn-remove" onClick={() => removeLine(i)}>✖</button>
                  )}
                </div>
              ))}

              {productLines.length < 4 && (
                <button className="btn btn-add" onClick={addLine}>+ Ajouter un produit</button>
              )}

              <div className="department-input">
                <label>🎯 Département de destination</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Ex: 75"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  min="1" max="95"
                />
              </div>

              {error && (
                <div className="error-box">⚠️ {error}</div>
              )}

              <button
                className={`btn-calculate ${isCalculating ? 'calculating' : ''}`}
                onClick={calculer}
                disabled={isCalculating}
              >
                {isCalculating
                  ? <span className="loading"><span className="spinner" />Calcul…</span>
                  : '🚀 Calculer le transport'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Panneau droit ── */}
        <div className="right-panel">
          <div className="card">
            <div className="section-title">📊 Résultats</div>
            <div className="results-container">
              {!result && !error && (
                <div className="results-placeholder">
                  Sélectionnez vos produits et cliquez sur "Calculer"
                </div>
              )}

              {result && <ResultDisplay result={result} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ResultDisplay({ result }) {
  const { solution_optimale, autres_options, infos, has_palette_complete, details_individuels } = result

  return (
    <div className="results">
      {has_palette_complete && (
        <div className="warning-box">
          ⚠️ <strong>Palette complète détectée</strong> — expédition en affrètement uniquement
        </div>
      )}

      {solution_optimale ? (
        <div className="cout-transport-bloc">
          <div className="cout-label">COÛT TRANSPORT</div>
          <div className="cout-prix">
            {solution_optimale.type_transport === 'Colis (DPD)'
              ? `${solution_optimale.prix.toFixed(2)} €`
              : `${Math.round(solution_optimale.prix)} €`}
          </div>
          <div className="cout-mode">{solution_optimale.type_transport}</div>
          <div className="cout-details">{solution_optimale.details}</div>
        </div>
      ) : (
        <div className="error-result">
          <strong>⚠️ Tarif sur devis</strong><br />
          Cette commande dépasse les seuils automatiques.
        </div>
      )}

      {autres_options?.length > 0 && (
        <div className="autres-options-bloc">
          <div className="autres-title">💡 AUTRES OPTIONS :</div>
          {autres_options.map((opt, i) => (
            <div key={i} className="autre-option">
              • {opt.details} — {opt.type_transport === 'Colis (DPD)'
                ? `${opt.prix.toFixed(2)} €`
                : `${Math.round(opt.prix)} €`} ({opt.type_transport})
            </div>
          ))}
        </div>
      )}

      <div className="infos-complementaires">
        <div><strong>⚖️ Poids total :</strong> {infos.poids_total} kg</div>
        <div><strong>📍 Destination :</strong> Dép. {infos.departement}</div>
        <div><strong>📏 Hauteur max :</strong> {infos.hauteur_max} cm</div>
        {infos.nb_colis_dpd > 0 && (
          <div><strong>📦 Colis DPD :</strong> {infos.nb_colis_dpd}</div>
        )}
        {infos.composition_globale?.length > 0 && (
          <div>
            <strong>🏗️ Palettes :</strong>{' '}
            {infos.composition_globale.map(([tp, nb]) => `${nb}x${tp}`).join(' ')}
          </div>
        )}
      </div>

      {details_individuels?.length > 0 && (
        <details className="details-techniques">
          <summary><strong>📋 DÉTAILS TECHNIQUES</strong></summary>
          <div className="detail-references">
            {details_individuels.map((p, i) => (
              <div key={i} className="reference-item">
                <strong>• {p.produit_ref}</strong> ({p.quantite} pièces)<br />
                Palétisation : {p.details}<br />
                Poids : {p.poids_total?.toFixed(1)} kg
                {p.force_affretement && <><br />⚠️ Affrètement forcé — palette complète</>}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

export default App
