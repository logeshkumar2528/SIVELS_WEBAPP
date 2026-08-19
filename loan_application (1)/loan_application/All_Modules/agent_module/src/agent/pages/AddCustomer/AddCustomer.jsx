import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  User,
  FileText,
  CreditCard,
  Upload,
  X,
  ArrowRight,
  ChevronRight,
  IdCard,
  Landmark,
  Trash2,
  Eye,
} from 'lucide-react'
import CustomerSubmitted from '../CustomerSubmitted/CustomerSubmitted'
import './AddCustomer.css'

function AddCustomer() {
  const navigate = useNavigate()

  // Form State
  const [formData, setFormData] = useState({
    fullName: 'John Doe',
    mobileNumber: '9876543210',
    email: 'john.doe@example.com',
    employmentType: 'Salaried',
    loanPurpose: 'Personal Loan',
    expectedAmount: '500000',
    remarks: 'Looking for a quick personal loan.',
  })

  // File Upload State
  const [panFile, setPanFile] = useState(null)
  const [aadhaarFile, setAadhaarFile] = useState(null)
  const [passbookFile, setPassbookFile] = useState(null)
  const [itSlipFile, setItSlipFile] = useState(null)
  const [otherDocsFiles, setOtherDocsFiles] = useState([])

  // Object URL Previews
  const [panPreview, setPanPreview] = useState(null)
  const [aadhaarPreview, setAadhaarPreview] = useState(null)
  const [passbookPreview, setPassbookPreview] = useState(null)
  const [itSlipPreview, setItSlipPreview] = useState(null)
  const [otherDocsPreviews, setOtherDocsPreviews] = useState([])

  // Modal Full Image Preview State
  const [modalImage, setModalImage] = useState(null)

  // Submitted Popup Success State
  const [submittedData, setSubmittedData] = useState(null)

  // Manage Preview Object URLs
  useEffect(() => {
    if (panFile && panFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(panFile)
      setPanPreview(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setPanPreview(null)
    }
  }, [panFile])

  useEffect(() => {
    if (aadhaarFile && aadhaarFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(aadhaarFile)
      setAadhaarPreview(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setAadhaarPreview(null)
    }
  }, [aadhaarFile])

  useEffect(() => {
    if (passbookFile && passbookFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(passbookFile)
      setPassbookPreview(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setPassbookPreview(null)
    }
  }, [passbookFile])

  useEffect(() => {
    if (itSlipFile && itSlipFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(itSlipFile)
      setItSlipPreview(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setItSlipPreview(null)
    }
  }, [itSlipFile])

  useEffect(() => {
    const urls = otherDocsFiles.map(f => {
      if (f.type.startsWith('image/')) return URL.createObjectURL(f)
      return null
    })
    setOtherDocsPreviews(urls)
    return () => urls.forEach(url => url && URL.revokeObjectURL(url))
  }, [otherDocsFiles])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e, setFile) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleRemoveFile = (setFile) => {
    setFile(null)
  }

  const handleMultipleFilesChange = (e) => {
    if (e.target.files) {
      setOtherDocsFiles((prev) => [...prev, ...Array.from(e.target.files)])
    }
  }

  const handleRemoveOtherDoc = (index) => {
    setOtherDocsFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // Generate unique Reference ID & show success popup
  const handleSubmit = (e) => {
    e.preventDefault()

    const now = new Date()
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const day = String(now.getDate()).padStart(2, '0')
    const month = months[now.getMonth()]
    const year = now.getFullYear()
    const hours = now.getHours()
    const mins = String(now.getMinutes()).padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const formattedHours = hours % 12 || 12
    const formattedDateTime = `${day} ${month} ${year}, ${formattedHours}:${mins} ${ampm}`

    // Unique random Reference ID: e.g. REF2508074921
    const yy = String(year).slice(-2)
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = day
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    const uniqueRefId = `REF${yy}${mm}${dd}${randomNum}`

    setSubmittedData({
      customerName: formData.fullName || 'Ramesh Kumar',
      mobileNumber: formData.mobileNumber || '98765 43210',
      submissionDate: formattedDateTime,
      referenceId: uniqueRefId,
    })
  }

  const handleResetForm = () => {
    setSubmittedData(null)
    setFormData({
      fullName: 'John Doe',
      mobileNumber: '9876543210',
      email: 'john.doe@example.com',
      employmentType: 'Salaried',
      loanPurpose: 'Personal Loan',
      expectedAmount: '500000',
      remarks: 'Looking for a quick personal loan.',
    })
    setPanFile(null)
    setAadhaarFile(null)
    setPassbookFile(null)
    setItSlipFile(null)
    setOtherDocsFiles([])
  }

  const handleCancel = () => {
    navigate('/Agent/dashboard')
  }

  return (
    <div className="add-customer">
      {/* Main Form Card */}
      <form className="add-customer-card" onSubmit={handleSubmit}>
        {/* SECTION 1: Basic Information */}
        <div className="form-section">
          <div className="form-section-header">
            <div className="form-section-icon-badge">
              <User size={15} strokeWidth={2} />
            </div>
            <h3 className="form-section-title">Basic Information</h3>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">
                Full Name<span className="required-star">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                name="fullName"
                className="form-input"
                placeholder="Enter full name"
                value={formData.fullName}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="mobileNumber">
                Mobile Number<span className="required-star">*</span>
              </label>
              <input
                id="mobileNumber"
                type="tel"
                name="mobileNumber"
                className="form-input"
                placeholder="Enter 10 digit mobile number"
                value={formData.mobileNumber}
                onChange={handleInputChange}
                maxLength={10}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email (Optional)
              </label>
              <input
                id="email"
                type="email"
                name="email"
                className="form-input"
                placeholder="Enter email address"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="employmentType">
                Employment Type<span className="required-star">*</span>
              </label>
              <select
                id="employmentType"
                name="employmentType"
                className="form-select"
                value={formData.employmentType}
                onChange={handleInputChange}
              >
                <option value="" disabled>Select employment type</option>
                <option value="Salaried">Salaried</option>
                <option value="Self-Employed / Un-Salaried">Self-Employed / Un-Salaried</option>
                <option value="Business">Business</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: Documents (Only 2 required) */}
        <div className="form-section">
          <div className="form-section-header">
            <div className="form-section-icon-badge">
              <FileText size={15} strokeWidth={2} />
            </div>
            <h3 className="form-section-title">Documents (Only 2 required)</h3>
          </div>

          <div className="documents-grid">
            {/* CARD 1: PAN Card */}
            <div className={`document-upload-card ${panFile ? 'has-file' : ''}`}>
              {panFile ? (
                <div className="file-preview-box">
                  {panPreview ? (
                    <img
                      src={panPreview}
                      alt="PAN Card Preview"
                      className="thumbnail-preview-img"
                      onClick={() => setModalImage({ src: panPreview, title: 'PAN Card Preview' })}
                    />
                  ) : (
                    <FileText size={18} className="document-icon-badge" />
                  )}
                  <div className="file-preview-details">
                    <span className="file-preview-name">{panFile.name}</span>
                    <span className="file-preview-size">({formatFileSize(panFile.size)})</span>
                  </div>
                  {panPreview && (
                    <button
                      type="button"
                      className="action-view"
                      onClick={() => setModalImage({ src: panPreview, title: 'PAN Card Preview' })}
                    >
                      <Eye size={14} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="document-card-top">
                  <div className="document-icon-badge">
                    <IdCard size={16} strokeWidth={1.8} />
                  </div>
                  <div className="document-card-info">
                    <h4>PAN Card<span className="required-star">*</span></h4>
                    <p>Upload clear image of PAN Card</p>
                    <p className="document-card-subtitle">JPG, PNG or PDF (Max. 2MB)</p>
                  </div>
                </div>
              )}

              <div className="file-actions-row">
                <label className="file-upload-btn">
                  <Upload size={13} strokeWidth={2} />
                  <span>{panFile ? 'Change' : 'Choose File'}</span>
                  <input
                    type="file"
                    className="file-input-hidden"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleFileChange(e, setPanFile)}
                  />
                </label>
                {panFile && (
                  <button
                    type="button"
                    className="file-remove-btn"
                    onClick={() => handleRemoveFile(setPanFile)}
                  >
                    <Trash2 size={13} />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>

            {/* CARD 2: Aadhaar Card */}
            <div className={`document-upload-card ${aadhaarFile ? 'has-file' : ''}`}>
              {aadhaarFile ? (
                <div className="file-preview-box">
                  {aadhaarPreview ? (
                    <img
                      src={aadhaarPreview}
                      alt="Aadhaar Card Preview"
                      className="thumbnail-preview-img"
                      onClick={() => setModalImage({ src: aadhaarPreview, title: 'Aadhaar Card Preview' })}
                    />
                  ) : (
                    <FileText size={18} className="document-icon-badge" />
                  )}
                  <div className="file-preview-details">
                    <span className="file-preview-name">{aadhaarFile.name}</span>
                    <span className="file-preview-size">({formatFileSize(aadhaarFile.size)})</span>
                  </div>
                  {aadhaarPreview && (
                    <button
                      type="button"
                      className="action-view"
                      onClick={() => setModalImage({ src: aadhaarPreview, title: 'Aadhaar Card Preview' })}
                    >
                      <Eye size={14} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="document-card-top">
                  <div className="document-icon-badge">
                    <User size={16} strokeWidth={1.8} />
                  </div>
                  <div className="document-card-info">
                    <h4>Aadhaar Card<span className="required-star">*</span></h4>
                    <p>Upload clear image of Aadhaar Card</p>
                    <p className="document-card-subtitle">JPG, PNG or PDF (Max. 2MB)</p>
                  </div>
                </div>
              )}

              <div className="file-actions-row">
                <label className="file-upload-btn">
                  <Upload size={13} strokeWidth={2} />
                  <span>{aadhaarFile ? 'Change' : 'Choose File'}</span>
                  <input
                    type="file"
                    className="file-input-hidden"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleFileChange(e, setAadhaarFile)}
                  />
                </label>
                {aadhaarFile && (
                  <button
                    type="button"
                    className="file-remove-btn"
                    onClick={() => handleRemoveFile(setAadhaarFile)}
                  >
                    <Trash2 size={13} />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>

            {/* CARD 3: Bank Passbook */}
            <div className={`document-upload-card ${passbookFile ? 'has-file' : ''}`}>
              {passbookFile ? (
                <div className="file-preview-box">
                  {passbookPreview ? (
                    <img
                      src={passbookPreview}
                      alt="Bank Passbook Preview"
                      className="thumbnail-preview-img"
                      onClick={() => setModalImage({ src: passbookPreview, title: 'Bank Passbook Preview' })}
                    />
                  ) : (
                    <FileText size={18} className="document-icon-badge" />
                  )}
                  <div className="file-preview-details">
                    <span className="file-preview-name">{passbookFile.name}</span>
                    <span className="file-preview-size">({formatFileSize(passbookFile.size)})</span>
                  </div>
                  {passbookPreview && (
                    <button
                      type="button"
                      className="action-view"
                      onClick={() => setModalImage({ src: passbookPreview, title: 'Bank Passbook Preview' })}
                    >
                      <Eye size={14} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="document-card-top">
                  <div className="document-icon-badge">
                    <Landmark size={16} strokeWidth={1.8} />
                  </div>
                  <div className="document-card-info">
                    <h4>Bank Passbook</h4>
                    <p>Upload clear image of Bank Passbook</p>
                    <p className="document-card-subtitle">JPG, PNG or PDF (Max. 2MB)</p>
                  </div>
                </div>
              )}

              <div className="file-actions-row">
                <label className="file-upload-btn">
                  <Upload size={13} strokeWidth={2} />
                  <span>{passbookFile ? 'Change' : 'Choose File'}</span>
                  <input
                    type="file"
                    className="file-input-hidden"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleFileChange(e, setPassbookFile)}
                  />
                </label>
                {passbookFile && (
                  <button
                    type="button"
                    className="file-remove-btn"
                    onClick={() => handleRemoveFile(setPassbookFile)}
                  >
                    <Trash2 size={13} />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>

            {/* CONDITIONAL SALARIED, BUSINESS & OTHER DOCUMENTS */}
            {(formData.employmentType === 'Salaried' || formData.employmentType === 'Business' || formData.employmentType === 'Other') && (
              <>
                {/* CARD 4: Salary Slip */}
                <div className={`document-upload-card ${itSlipFile ? 'has-file' : ''}`}>
                  {itSlipFile ? (
                    <div className="file-preview-box">
                      {itSlipPreview ? (
                        <img
                          src={itSlipPreview}
                          alt="Salary Slip Preview"
                          className="thumbnail-preview-img"
                          onClick={() => setModalImage({ src: itSlipPreview, title: 'Salary Slip Preview' })}
                        />
                      ) : (
                        <FileText size={18} className="document-icon-badge" />
                      )}
                      <div className="file-preview-details">
                        <span className="file-preview-name">{itSlipFile.name}</span>
                        <span className="file-preview-size">({formatFileSize(itSlipFile.size)})</span>
                      </div>
                      {itSlipPreview && (
                        <button
                          type="button"
                          className="action-view"
                          onClick={() => setModalImage({ src: itSlipPreview, title: 'Salary Slip Preview' })}
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="document-card-top">
                      <div className="document-icon-badge">
                        <FileText size={16} strokeWidth={1.8} />
                      </div>
                      <div className="document-card-info">
                        <h4>Salary Slip<span className="required-star">*</span></h4>
                        <p>Upload clear image of Salary Slip</p>
                        <p className="document-card-subtitle">JPG, PNG or PDF (Max. 2MB)</p>
                      </div>
                    </div>
                  )}

                  <div className="file-actions-row">
                    <label className="file-upload-btn">
                      <Upload size={13} strokeWidth={2} />
                      <span>{itSlipFile ? 'Change' : 'Choose File'}</span>
                      <input
                        type="file"
                        className="file-input-hidden"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => handleFileChange(e, setItSlipFile)}
                      />
                    </label>
                    {itSlipFile && (
                      <button
                        type="button"
                        className="file-remove-btn"
                        onClick={() => handleRemoveFile(setItSlipFile)}
                      >
                        <Trash2 size={13} />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* CARD 5: Other Documents (Multiple) */}
                <div className={`document-upload-card ${otherDocsFiles.length > 0 ? 'has-file' : ''}`}>
                  {otherDocsFiles.length > 0 ? (
                    <div className="file-preview-box" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                      {otherDocsFiles.map((file, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '4px', border: '1px solid #eaeaea', borderRadius: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={14} />
                            <div className="file-preview-details" style={{ margin: 0 }}>
                              <span className="file-preview-name" style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="file-remove-btn"
                            onClick={() => handleRemoveOtherDoc(index)}
                            style={{ padding: '2px 4px', background: 'transparent', border: 'none' }}
                          >
                            <Trash2 size={13} color="#ef4444" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="document-card-top">
                      <div className="document-icon-badge">
                        <FileText size={16} strokeWidth={1.8} />
                      </div>
                      <div className="document-card-info">
                        <h4>Other Documents</h4>
                        <p>Upload any other supporting docs</p>
                        <p className="document-card-subtitle">Upload multiple files</p>
                      </div>
                    </div>
                  )}

                  <div className="file-actions-row">
                    <label className="file-upload-btn">
                      <Upload size={13} strokeWidth={2} />
                      <span>{otherDocsFiles.length > 0 ? 'Add More' : 'Choose Files'}</span>
                      <input
                        type="file"
                        multiple
                        className="file-input-hidden"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={handleMultipleFilesChange}
                      />
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* SECTION 3: Loan Requirement */}
        <div className="form-section">
          <div className="form-section-header">
            <div className="form-section-icon-badge">
              <CreditCard size={15} strokeWidth={2} />
            </div>
            <h3 className="form-section-title">Loan Requirement</h3>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="loanPurpose">
                Loan Purpose<span className="required-star">*</span>
              </label>
              <select
                id="loanPurpose"
                name="loanPurpose"
                className="form-select"
                value={formData.loanPurpose}
                onChange={handleInputChange}
              >
                <option value="" disabled>
                  Select purpose
                </option>
                <option value="Personal Loan">Personal Loan</option>
                <option value="Business Loan">Business Loan</option>
                <option value="Home Loan">Home Loan</option>
                <option value="Vehicle Loan">Vehicle Loan</option>
                <option value="Education Loan">Education Loan</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="expectedAmount">
                Expected Loan Amount (₹)<span className="required-star">*</span>
              </label>
              <input
                id="expectedAmount"
                type="number"
                name="expectedAmount"
                className="form-input"
                placeholder="Enter expected loan amount"
                value={formData.expectedAmount}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-grid-full">
            <div className="form-group">
              <label className="form-label" htmlFor="remarks">
                Remarks (Optional)
              </label>
              <textarea
                id="remarks"
                name="remarks"
                className="form-textarea"
                placeholder="Enter any remarks"
                rows={3}
                value={formData.remarks}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={handleCancel}>
            <X size={15} strokeWidth={2} /> Cancel
          </button>
          <button type="submit" className="btn-submit">
            Save & Next <ArrowRight size={15} strokeWidth={2} />
          </button>
        </div>
      </form>

      {/* FULL IMAGE MODAL PREVIEW */}
      {modalImage && (
        <div className="image-modal-backdrop" onClick={() => setModalImage(null)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="image-modal-header">
              <span className="image-modal-title">{modalImage.title}</span>
              <button
                type="button"
                className="image-modal-close"
                onClick={() => setModalImage(null)}
              >
                <X size={18} />
              </button>
            </div>
            <img src={modalImage.src} alt="Full Document Preview" className="image-modal-img" />
          </div>
        </div>
      )}

      {/* CUSTOMER SUBMITTED SUCCESS POPUP (5-SECOND COUNTDOWN) */}
      {submittedData && (
        <CustomerSubmitted
          customerName={submittedData.customerName}
          mobileNumber={submittedData.mobileNumber}
          submissionDate={submittedData.submissionDate}
          referenceId={submittedData.referenceId}
          autoCloseSeconds={5}
          onAddAnother={handleResetForm}
          onGoToHistory={() => navigate('/Agent/submission-history')}
        />
      )}
    </div>
  )
}

export default AddCustomer
