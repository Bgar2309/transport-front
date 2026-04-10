import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_KEY = import.meta.env.VITE_API_KEY || 'changeme'
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin'

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
}

const PALETTE_KEYS   = ['carton', 'palette_40x60', 'palette_60x80', 'palette_80x120', 'palette_115x115']
const PALETTE_LABELS = ['Carton (DPD)', '40×60', '60×80', '80×120', '115×115']

const EMPTY_PRODUIT = {
  nom: '', description: '', poids_unitaire: '',
  carton:          { qte_max: 0, transport: 'colis DPD' },
  palette_40x60:   { qte_max: 0, transport: 'forfait palette, messagerie, affretement' },
  palette_60x80:   { qte_max: 0, transport: 'forfait palette, messagerie, affretement' },
  palette_80x120:  { qte_max: 0, transport: 'forfait palette, messagerie, affretement' },
  palette_115x115: { qte_max: 0, transport: 'affretement' },
}

// ─── Composant Admin ──────────────────────────────────────────────────────────

function AdminPanel({ onClose }) {
  const [produits, setProduits]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(null)
  const [edited, setEdited]       = useState({})
  const [newRow, setNewRow]       = useState(null)
  const [error, setError]         = useState(null)
  const [success, setSuccess]     = useState(null)
  const [confirmDel, setConfirmDel] = useState(null) // nom du produit à supprimer

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(null), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/produits`, { headers })
      const data = await res.json()
      setProduits(data.produits || [])
      setEdited({})
    } catch { setError('Impossible de charger les données') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCell = (nom, field, subfield, value) => {
    const base = edited[nom] || produits.find(p => p.nom === nom)
    const updated = JSON.parse(JSON.stringify(base))
    if (subfield) updated[field][subfield] = subfield === 'qte_max' ? parseInt(value) || 0 : value
    else updated[field] = field === 'poids_unitaire' ? parseFloat(value) || 0 : value
    setEdited(e => ({ ...e, [nom]: updated }))
  }

  const handleNewCell = (field, subfield, value) => {
    setNewRow(prev => {
      const updated = JSON.parse(JSON.stringify(prev))
      if (subfield) updated[field][subfield] = subfield === 'qte_max' ? parseInt(value) || 0 : value
      else updated[field] = field === 'poids_unitaire' ? parseFloat(value) || 0 : value
      return updated
    })
  }

  const save = async (nomOriginal) => {
    const p = edited[nomOriginal]
    if (!p) return
    setSaving(nomOriginal)
    setError(null)
    try {
      // Si le nom a changé, on passe l'ancien nom dans l'URL
      const res = await fetch(`${API_URL}/api/admin/produits/${encodeURIComponent(nomOriginal)}`, {
        method: 'PUT', headers, body: JSON.stringify(p),
      })
      if (!res.ok) throw new Error((await res.json()).detail)
      flash(`✅ "${p.nom}" mis à jour`)
      await load()
    } catch (e) { setError(e.message) }
    finally { setSaving(null) }
  }

  const saveNew = async () => {
    if (!newRow?.nom?.trim()) { setError('Le nom du produit est obligatoire'); return }
    setSaving('__new__')
    setError(null)
    try {
      const res = await fetch(`${API_URL}/api/admin/produits`, {
        method: 'POST', headers, body: JSON.stringify(newRow),
      })
      if (!res.ok) throw new Error((await res.json()).detail)
      flash(`✅ "${newRow.nom}" ajouté`)
      setNewRow(null)
      await load()
    } catch (e) { setError(e.message) }
    finally { setSaving(null) }
  }

  const deleteProduit = async (nom) => {
    setSaving(nom)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/api/admin/produits/${encodeURIComponent(nom)}`, {
        method: 'DELETE', headers,
      })
      if (!res.ok) throw new Error((await res.json()).detail)
      flash(`🗑️ "${nom}" supprimé`)
      setConfirmDel(null)
      await load()
    } catch (e) { setError(e.message) }
    finally { setSaving(null) }
  }

  return (
    <div className="admin-overlay">
      <div className="admin-panel">
        <div className="admin-header">
          <div>
            <h2>⚙️ Administration — Références produits</h2>
            <p className="admin-subtitle">Modifications enregistrées directement dans fichiercone.xlsx</p>
          </div>
          <button className="admin-close" onClick={onClose}>✖</button>
        </div>

        {error   && <div className="admin-error">⚠️ {error}</div>}
        {success && <div className="admin-success">{success}</div>}

        {/* Modal confirmation suppression */}
        {confirmDel && (
          <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <h3>🗑️ Confirmer la suppression</h3>
              <p style={{textAlign:'center', color:'#4a5568', margin:'8px 0 16px'}}>
                Supprimer <strong>"{confirmDel}"</strong> ?<br/>
                <small>Cette action est irréversible.</small>
              </p>
              <div className="modal-btns">
                <button className="modal-btn-cancel" onClick={() => setConfirmDel(null)}>Annuler</button>
                <button className="modal-btn-delete" onClick={() => deleteProduit(confirmDel)}
                  disabled={saving === confirmDel}>
                  {saving === confirmDel ? '…' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="admin-loading"><div className="spinner-large" /><p>Chargement…</p></div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="col-nom">Nom produit</th>
                  <th className="col-desc">Description</th>
                  <th className="col-poids">Poids unit.</th>
                  {PALETTE_LABELS.map(l => (
                    <th key={l} colSpan={2} className="col-palette-group">{l}</th>
                  ))}
                  <th className="col-actions">Actions</th>
                </tr>
                <tr className="subheader">
                  <th /><th /><th />
                  {PALETTE_LABELS.map(l => (
                    <>
                      <th key={l+'-q'} className="col-qte">Qté max</th>
                      <th key={l+'-t'} className="col-transport">Transport</th>
                    </>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {produits.map(p => {
                  const row = edited[p.nom] || p
                  const dirty = !!edited[p.nom]
                  return (
                    <tr key={p.nom} className={dirty ? 'row-dirty' : ''}>
                      {/* Nom — éditable */}
                      <td>
                        <input className="cell-input cell-nom-edit"
                          value={row.nom || ''}
                          onChange={e => handleCell(p.nom, 'nom', null, e.target.value)} />
                      </td>
                      <td>
                        <input className="cell-input cell-desc"
                          value={row.description || ''}
                          onChange={e => handleCell(p.nom, 'description', null, e.target.value)} />
                      </td>
                      <td>
                        <input className="cell-input cell-poids" type="number" step="0.1"
                          value={row.poids_unitaire ?? ''}
                          onChange={e => handleCell(p.nom, 'poids_unitaire', null, e.target.value)} />
                      </td>
                      {PALETTE_KEYS.map(key => (
                        <>
                          <td key={key+'-q'}>
                            <input className={`cell-input cell-qte${(row[key]?.qte_max === 0) ? ' cell-zero' : ''}`}
                              type="number" min="0"
                              value={row[key]?.qte_max ?? 0}
                              onChange={e => handleCell(p.nom, key, 'qte_max', e.target.value)} />
                          </td>
                          <td key={key+'-t'}>
                            <input className="cell-input cell-transport"
                              value={row[key]?.transport || ''}
                              onChange={e => handleCell(p.nom, key, 'transport', e.target.value)} />
                          </td>
                        </>
                      ))}
                      <td className="col-actions">
                        {dirty && (
                          <button className="btn-save" title="Sauvegarder"
                            onClick={() => save(p.nom)} disabled={saving === p.nom}>
                            {saving === p.nom ? '…' : '💾'}
                          </button>
                        )}
                        <button className="btn-delete" title="Supprimer"
                          onClick={() => setConfirmDel(p.nom)} disabled={!!saving}>
                          🗑️
                        </button>
                      </td>
                    </tr>
                  )
                })}

                {newRow && (
                  <tr className="row-new">
                    <td>
                      <input className="cell-input cell-nom-edit" placeholder="Nom *"
                        value={newRow.nom}
                        onChange={e => handleNewCell('nom', null, e.target.value)} />
                    </td>
                    <td>
                      <input className="cell-input cell-desc" placeholder="Description"
                        value={newRow.description}
                        onChange={e => handleNewCell('description', null, e.target.value)} />
                    </td>
                    <td>
                      <input className="cell-input cell-poids" type="number" step="0.1" placeholder="kg"
                        value={newRow.poids_unitaire}
                        onChange={e => handleNewCell('poids_unitaire', null, e.target.value)} />
                    </td>
                    {PALETTE_KEYS.map(key => (
                      <>
                        <td key={key+'-q'}>
                          <input className="cell-input cell-qte" type="number" min="0"
                            value={newRow[key]?.qte_max ?? 0}
                            onChange={e => handleNewCell(key, 'qte_max', e.target.value)} />
                        </td>
                        <td key={key+'-t'}>
                          <input className="cell-input cell-transport"
                            value={newRow[key]?.transport || ''}
                            onChange={e => handleNewCell(key, 'transport', e.target.value)} />
                        </td>
                      </>
                    ))}
                    <td className="col-actions">
                      <button className="btn-save" onClick={saveNew} disabled={saving === '__new__'}>
                        {saving === '__new__' ? '…' : '✅'}
                      </button>
                      <button className="btn-cancel" onClick={() => setNewRow(null)}>✖</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="admin-footer">
          {!newRow && (
            <button className="btn-add-row"
              onClick={() => setNewRow(JSON.parse(JSON.stringify(EMPTY_PRODUIT)))}>
              + Ajouter un produit
            </button>
          )}
          <span className="admin-hint">💡 Cliquez dans une cellule pour modifier — 💾 pour sauvegarder — 🗑️ pour supprimer</span>
        </div>
      </div>
    </div>
  )
}

// ─── Modal login ──────────────────────────────────────────────────────────────

function LoginModal({ onSuccess, onClose }) {
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState(false)
  const submit = () => {
    if (pwd === ADMIN_PASSWORD) { onSuccess() }
    else { setErr(true); setPwd('') }
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3>🔐 Accès administrateur</h3>
        <input type="password" className="modal-input" placeholder="Mot de passe"
          value={pwd} autoFocus
          onChange={e => { setPwd(e.target.value); setErr(false) }}
          onKeyDown={e => e.key === 'Enter' && submit()} />
        {err && <div className="modal-error">Mot de passe incorrect</div>}
        <div className="modal-btns">
          <button className="modal-btn-cancel" onClick={onClose}>Annuler</button>
          <button className="modal-btn-ok" onClick={submit}>Entrer</button>
        </div>
      </div>
    </div>
  )
}

// ─── Dropdown avec recherche ──────────────────────────────────────────────────

function SearchableSelect({ options, value, onChange, placeholder }) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  )

  const handleInputChange = (e) => {
    setSearch(e.target.value)
    setIsOpen(true)
    if (!e.target.value) onChange('')
  }

  const handleSelect = (opt) => {
    onChange(opt)
    setSearch('')
    setIsOpen(false)
  }

  return (
    <div className="searchable-select" ref={ref}>
      <input
        type="text"
        className="select"
        value={isOpen ? search : value}
        placeholder={placeholder}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
      />
      {isOpen && (
        <ul className="select-dropdown">
          {filtered.length > 0
            ? filtered.map(opt => (
                <li key={opt} className={opt === value ? 'selected' : ''} onClick={() => handleSelect(opt)}>
                  {opt}
                </li>
              ))
            : <li className="no-results">Aucun résultat</li>
          }
        </ul>
      )}
    </div>
  )
}

// ─── App principale ───────────────────────────────────────────────────────────

function App() {
  const [productLines, setProductLines] = useState([{ product: '', quantity: '' }])
  const [department, setDepartment]     = useState('')
  const [produits, setProduits]         = useState([])
  const [result, setResult]             = useState(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError]               = useState(null)
  const [loading, setLoading]           = useState(true)
  const [showLogin, setShowLogin]       = useState(false)
  const [showAdmin, setShowAdmin]       = useState(false)

  const fetchProduits = useCallback(() => {
    fetch(`${API_URL}/api/produits`, { headers })
      .then(r => r.json())
      .then(data => { setProduits(data.produits || []); setLoading(false) })
      .catch(() => { setError('Impossible de contacter le serveur'); setLoading(false) })
  }, [])

  useEffect(() => { fetchProduits() }, [fetchProduits])

  const addLine    = () => { if (productLines.length < 4) setProductLines([...productLines, { product: '', quantity: '' }]) }
  const removeLine = (i) => setProductLines(productLines.filter((_, idx) => idx !== i))
  const updateLine = (i, field, value) => {
    const lines = [...productLines]; lines[i][field] = value; setProductLines(lines)
  }

  const calculer = async () => {
    setError(null); setResult(null)
    const dept = parseInt(department)
    if (isNaN(dept) || dept < 1 || dept > 95) { setError('Département invalide (1-95)'); return }
    const lignes = productLines
      .filter(l => l.product && parseInt(l.quantity) > 0)
      .map(l => ({ produit: l.product, quantite: parseInt(l.quantity) }))
    if (!lignes.length) { setError('Sélectionnez au moins un produit avec une quantité'); return }
    setIsCalculating(true)
    try {
      const res = await fetch(`${API_URL}/api/calcul`, {
        method: 'POST', headers, body: JSON.stringify({ lignes, departement: dept }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Erreur serveur') }
      setResult(await res.json())
    } catch (e) { setError(e.message) }
    finally { setIsCalculating(false) }
  }

  const handleAdminClose = () => { setShowAdmin(false); fetchProduits() }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content"><div className="spinner-large" /><h2>Connexion au serveur…</h2></div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <button className="admin-icon-btn" title="Administration" onClick={() => setShowLogin(true)}>⚙️</button>

      {showLogin && !showAdmin && (
        <LoginModal onSuccess={() => { setShowLogin(false); setShowAdmin(true) }} onClose={() => setShowLogin(false)} />
      )}
      {showAdmin && <AdminPanel onClose={handleAdminClose} />}

      <div className="header">
        <h1 className="title">Calculateur de Transport EHS</h1>
      </div>

      <div className="main-content">
        <div className="left-panel">
          <div className="card">
            <div className="section-title">📋 Produits à expédier</div>
            <div className="card-content">
              {productLines.map((line, i) => (
                <div key={i} className="product-line">
                  <SearchableSelect
                    options={produits}
                    value={line.product}
                    onChange={v => updateLine(i, 'product', v)}
                    placeholder="Rechercher un produit…"
                  />
                  <input type="number" className="input" placeholder="Quantité"
                    value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                  {i > 0 && <button className="btn btn-remove" onClick={() => removeLine(i)}>✖</button>}
                </div>
              ))}
              {productLines.length < 4 && (
                <button className="btn btn-add" onClick={addLine}>+ Ajouter un produit</button>
              )}
              <div className="department-input">
                <label>🎯 Département de destination</label>
                <input type="number" className="input" placeholder="Ex: 75"
                  value={department} onChange={e => setDepartment(e.target.value)} min="1" max="95" />
              </div>
              {error && <div className="error-box">⚠️ {error}</div>}
              <button className={`btn-calculate ${isCalculating ? 'calculating' : ''}`}
                onClick={calculer} disabled={isCalculating}>
                {isCalculating ? <span className="loading"><span className="spinner" />Calcul…</span> : '🚀 Calculer le transport'}
              </button>
            </div>
          </div>
        </div>

        <div className="right-panel">
          <div className="card">
            <div className="section-title">📊 Résultats</div>
            <div className="results-container">
              {!result && !error && <div className="results-placeholder">Sélectionnez vos produits et cliquez sur "Calculer"</div>}
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
        <div className="warning-box">⚠️ <strong>Palette complète détectée</strong> — expédition en affrètement uniquement</div>
      )}
      {solution_optimale ? (
        <div className="cout-transport-bloc">
          <div className="cout-label">COÛT TRANSPORT</div>
          <div className="cout-prix">
            {solution_optimale.type_transport === 'Colis (DPD)' ? `${solution_optimale.prix.toFixed(2)} €` : `${Math.round(solution_optimale.prix)} €`}
          </div>
          <div className="cout-mode">{solution_optimale.type_transport}</div>
          <div className="cout-details">{solution_optimale.details}</div>
        </div>
      ) : (
        <div className="error-result"><strong>⚠️ Tarif sur devis</strong><br />Cette commande dépasse les seuils automatiques.</div>
      )}
      {autres_options?.length > 0 && (
        <div className="autres-options-bloc">
          <div className="autres-title">💡 AUTRES OPTIONS :</div>
          {autres_options.map((opt, i) => (
            <div key={i} className="autre-option">
              • {opt.details} — {opt.type_transport === 'Colis (DPD)' ? `${opt.prix.toFixed(2)} €` : `${Math.round(opt.prix)} €`} ({opt.type_transport})
            </div>
          ))}
        </div>
      )}
      <div className="infos-complementaires">
        <div><strong>⚖️ Poids total :</strong> {infos.poids_total} kg</div>
        <div><strong>📍 Destination :</strong> Dép. {infos.departement}</div>
        <div><strong>📏 Hauteur max :</strong> {infos.hauteur_max} cm</div>
        {infos.nb_colis_dpd > 0 && <div><strong>📦 Colis DPD :</strong> {infos.nb_colis_dpd}</div>}
        {infos.composition_globale?.length > 0 && (
          <div><strong>🏗️ Palettes :</strong> {infos.composition_globale.map(([tp, nb]) => `${nb}x${tp}`).join(' ')}</div>
        )}
      </div>
      {details_individuels?.length > 0 && (
        <details className="details-techniques">
          <summary><strong>📋 DÉTAILS TECHNIQUES</strong></summary>
          {details_individuels.map((p, i) => (
            <div key={i} className="reference-item">
              <strong>• {p.produit_ref}</strong> ({p.quantite} pièces)<br />
              Palétisation : {p.details}<br />
              Poids : {p.poids_total?.toFixed(1)} kg
              {p.force_affretement && <><br />⚠️ Affrètement forcé — palette complète</>}
            </div>
          ))}
        </details>
      )}
    </div>
  )
}

export default App