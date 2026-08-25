import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  FileText,
  CreditCard,
  Upload,
  X,
  ArrowRight,
  IdCard,
  Landmark,
  Trash2,
  Eye,
  CheckCircle2
} from 'lucide-react'
import CustomerSubmitted from '../CustomerSubmitted/CustomerSubmitted'
import './AddCustomer.css'
import { masterService } from '../../../../../../Core/src/services/masterService'
import { agentCustomerService } from '../../../../../../Core/src/services/agentCustomerService'
import { useAuth } from '../../../../../../Core/src/context/AuthContext'

function AddCustomer() {
  const navigate = useNavigate()

  const { currentUser } = useAuth();
  
  // Use authenticated user ID if available, otherwise fallback to temporary ID 2
  const agentId = currentUser?.userId || currentUser?.id || 2;

  // Master Data State
  const [employmentTypes, setEmploymentTypes] = useState([])
  const [loanPurposes, setLoanPurposes] = useState([])
  const [documentTypes, setDocumentTypes] = useState([])
  
  // Specific Error States
  const [employmentTypesError, setEmploymentTypesError] = useState(false)
  const [loanPurposesError, setLoanPurposesError] = useState(false)
  
  // Loading States
  const [loadingMasters, setLoadingMasters] = useState(true)
  const [loadingMapping, setLoadingMapping] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState(null)

  // Document Mapping State
  const [documentMappings, setDocumentMappings] = useState([])

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    employmentTypeId: '',
    loanPurposeId: '',
    expectedAmount: '',
    remarks: '',
  })

  // File Upload State: { [documentTypeId]: File | File[] }
  const [selectedFiles, setSelectedFiles] = useState({})
  
  // Previews: { [documentTypeId]: string | string[] }
  const [previews, setPreviews] = useState({})

  // Modal Full Image Preview State
  const [modalImage, setModalImage] = useState(null)

  // Submitted Popup Success State
  const [submittedData, setSubmittedData] = useState(null)
  const [createdCustomerId, setCreatedCustomerId] = useState(null)
  const [uploadedDocuments, setUploadedDocuments] = useState([])

  // Fetch Master Data on Mount
  useEffect(() => {
    const fetchMasters = async () => {
      const extractArray = (res) => {
        if (Array.isArray(res)) return res
        if (res && typeof res === 'object') {
           if (Array.isArray(res.data)) return res.data
           if (Array.isArray(res.items)) return res.items
           if (Array.isArray(res.result)) return res.result
           if (Array.isArray(res.list)) return res.list
           for (const key of Object.keys(res)) {
              if (Array.isArray(res[key])) return res[key]
           }
        }
        return []
      }

      try {
        const typesRes = await masterService.getEmploymentTypes()
        const arr = extractArray(typesRes)
        setEmploymentTypes(arr.filter(t => t.isActive !== false))
      } catch (err) {
        setEmploymentTypesError(true)
      }

      try {
        const purposesRes = await masterService.getLoanPurposes()
        const arr = extractArray(purposesRes)
        setLoanPurposes(arr.filter(p => p.isActive !== false))
      } catch (err) {
        setLoanPurposesError(true)
      }
      
      try {
        const docTypesRes = await masterService.getDocumentTypes()
        const arr = extractArray(docTypesRes)
        setDocumentTypes(arr)
      } catch (err) {
        console.error("Failed to load document types", err)
      }

      setLoadingMasters(false)
    }
    fetchMasters()
  }, [])

  // When Employment Type Changes -> Load Document Mappings
  useEffect(() => {
    if (!formData.employmentTypeId) {
      setDocumentMappings([])
      setSelectedFiles({})
      setPreviews({})
      setUploadedDocuments([])
      return
    }

    const loadMapping = async () => {
      setLoadingMapping(true)
      try {
        const res = await masterService.getEmploymentTypeDocumentMapping(formData.employmentTypeId)
        
        const extractArray = (data) => {
          if (Array.isArray(data)) return data
          if (data && typeof data === 'object') {
             if (Array.isArray(data.data)) return data.data
             if (Array.isArray(data.items)) return data.items
             if (Array.isArray(data.result)) return data.result
             if (Array.isArray(data.list)) return data.list
             for (const key of Object.keys(data)) {
                if (Array.isArray(data[key])) return data[key]
             }
          }
          return []
        }

        const allMappings = extractArray(res)
        
        // Resolve required documents based on active mapping AND active document type
        const resolvedMappings = allMappings.reduce((acc, mapping) => {
          if (mapping.isActive === true) {
            const doc = documentTypes.find(d => Number(d.documentTypeId || d.id) === Number(mapping.documentTypeId))
            
            if (doc && doc.isActive === true) {
              acc.push({
                ...mapping, // preserves isMandatory, IDs, etc.
                documentTypeName: doc.documentTypeName || doc.name || mapping.documentTypeName,
                documentTypeCode: doc.documentTypeCode || doc.code
              })
            }
          }
          return acc
        }, [])

        setDocumentMappings(resolvedMappings)
        setSelectedFiles({})
        setPreviews({})
        setUploadedDocuments([])
      } catch (err) {
        setGlobalError("Unable to load required documents. Please try selecting the Employment Type again.")
        setDocumentMappings([])
      } finally {
        setLoadingMapping(false)
      }
    }

    // Ensure documentTypes are loaded before trying to resolve mappings
    if (documentTypes.length > 0) {
      loadMapping()
    }
  }, [formData.employmentTypeId, documentTypes])

  // Manage Preview Object URLs
  useEffect(() => {
    const newPreviews = {}
    
    Object.keys(selectedFiles).forEach(docTypeId => {
      const fileData = selectedFiles[docTypeId]
      if (!fileData) return

      if (Array.isArray(fileData)) {
        newPreviews[docTypeId] = fileData.map(f => {
          if (f.type.startsWith('image/')) return URL.createObjectURL(f)
          return null
        })
      } else {
        if (fileData.type.startsWith('image/')) {
          newPreviews[docTypeId] = URL.createObjectURL(fileData)
        }
      }
    })

    setPreviews(newPreviews)

    return () => {
      Object.values(newPreviews).forEach(val => {
        if (Array.isArray(val)) {
          val.forEach(url => url && URL.revokeObjectURL(url))
        } else if (val) {
          URL.revokeObjectURL(val)
        }
      })
    }
  }, [selectedFiles])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateFile = (file) => {
    const allowedExtensions = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    const maxSize = 10 * 1024 * 1024 // 10 MB

    if (!allowedExtensions.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png)$/i)) {
      alert(`Invalid file type for ${file.name}. Only PDF, JPG, JPEG and PNG files are allowed.`)
      return false
    }
    if (file.size > maxSize) {
      alert(`File size must not exceed 10 MB for ${file.name}.`)
      return false
    }
    return true
  }

  const handleFileChange = (e, documentTypeId, isMultiple = false) => {
    if (!e.target.files || e.target.files.length === 0) return

    if (isMultiple) {
      const newFiles = Array.from(e.target.files)
      const validFiles = newFiles.filter(validateFile)
      if (validFiles.length > 0) {
        setSelectedFiles(prev => ({
          ...prev,
          [documentTypeId]: [...(prev[documentTypeId] || []), ...validFiles]
        }))
      }
    } else {
      const file = e.target.files[0]
      if (validateFile(file)) {
        setSelectedFiles(prev => ({
          ...prev,
          [documentTypeId]: file
        }))
      }
    }
    e.target.value = '' // reset file input
  }

  const handleRemoveFile = (documentTypeId, index = null) => {
    setSelectedFiles(prev => {
      const newFiles = { ...prev }
      if (index !== null && Array.isArray(newFiles[documentTypeId])) {
        newFiles[documentTypeId] = newFiles[documentTypeId].filter((_, i) => i !== index)
        if (newFiles[documentTypeId].length === 0) {
          delete newFiles[documentTypeId]
        }
      } else {
        delete newFiles[documentTypeId]
      }
      return newFiles
    })
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getDocumentIcon = (name) => {
    const n = (name || '').toLowerCase()
    if (n.includes('image') || n.includes('photo')) return User
    if (n.includes('pan') || n.includes('aadhaar') || n.includes('id')) return IdCard
    if (n.includes('bank') || n.includes('passbook')) return Landmark
    return FileText
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGlobalError(null)

    // Form Validation
    if (formData.mobileNumber.length !== 10 || !/^[6-9]/.test(formData.mobileNumber)) {
      setGlobalError('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.')
      window.scrollTo(0, 0)
      return
    }

    let processedEmail = null
    if (formData.email && formData.email.trim() !== '') {
      processedEmail = formData.email.trim()
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(processedEmail)) {
        setGlobalError('Please enter a valid email address.')
        window.scrollTo(0, 0)
        return
      }
    }

    const expectedAmt = Number(formData.expectedAmount)
    if (!expectedAmt || expectedAmt <= 0) {
      setGlobalError('Please enter a valid positive Expected Loan Amount.')
      window.scrollTo(0, 0)
      return
    }

    // Document Validation
    for (const mapping of documentMappings) {
      if (mapping.isMandatory && !uploadedDocuments.includes(mapping.documentTypeId)) {
        const files = selectedFiles[mapping.documentTypeId]
        if (!files || (Array.isArray(files) && files.length === 0)) {
          setGlobalError(`Please upload all required documents. Missing: ${mapping.documentTypeName || 'Document'}`)
          window.scrollTo(0, 0)
          return
        }
      }
    }

    setSubmitting(true)

    try {
      let agentCustomerId = createdCustomerId;

      // 1. Create Customer (only if not already created)
      if (!agentCustomerId) {
        const customerPayload = {
          agentId: Number(agentId),
          fullName: formData.fullName,
          mobileNumber: formData.mobileNumber,
          email: processedEmail,
          employmentTypeId: Number(formData.employmentTypeId),
          loanPurposeId: Number(formData.loanPurposeId),
          expectedLoanAmount: Number(formData.expectedAmount),
          remarks: formData.remarks,
          status: "Draft",
          isActive: true,
          createdBy: Number(agentId) // using agentId as createdBy
        }

        const createResponse = await agentCustomerService.createCustomer(customerPayload)
        agentCustomerId = createResponse?.agentCustomerId || createResponse?.id || createResponse?.data?.agentCustomerId || createResponse?.data?.id
        
        if (!agentCustomerId) {
          throw new Error('Failed to retrieve Customer ID from server.')
        }
        setCreatedCustomerId(agentCustomerId)
      }

      // 2. Upload Documents sequentially to track failures correctly
      const failedUploads = []
      const successfulUploads = []
      
      for (const docTypeIdStr of Object.keys(selectedFiles)) {
        const docTypeId = Number(docTypeIdStr)
        const filesData = selectedFiles[docTypeIdStr]
        const filesArray = Array.isArray(filesData) ? filesData : [filesData]
        
        for (let i = 0; i < filesArray.length; i++) {
          const file = filesArray[i]
          const docFormData = new FormData()
          docFormData.append('file', file)
          docFormData.append('agentCustomerId', String(agentCustomerId))
          docFormData.append('documentTypeId', String(docTypeId))
          docFormData.append('createdBy', String(agentId))
          
          try {
            await agentCustomerService.uploadDocument(docFormData)
            successfulUploads.push({ docTypeId, index: i, isMultiple: Array.isArray(filesData) })
          } catch (err) {
            failedUploads.push(file.name)
          }
        }
      }

      // Remove successful uploads from state
      if (successfulUploads.length > 0) {
        // Mark documents as uploaded so they bypass validation on retry
        setUploadedDocuments(prev => {
          const newDocIds = successfulUploads.map(u => u.docTypeId)
          return Array.from(new Set([...prev, ...newDocIds]))
        })

        setSelectedFiles(prev => {
          const newFiles = { ...prev }
          // Process in reverse to avoid index shifting if multiple files per docType
          for (let i = successfulUploads.length - 1; i >= 0; i--) {
            const { docTypeId, index, isMultiple } = successfulUploads[i]
            if (isMultiple && Array.isArray(newFiles[docTypeId])) {
              newFiles[docTypeId] = newFiles[docTypeId].filter((_, idx) => idx !== index)
              if (newFiles[docTypeId].length === 0) {
                delete newFiles[docTypeId]
              }
            } else {
              delete newFiles[docTypeId]
            }
          }
          return newFiles
        })
      }

      if (failedUploads.length > 0) {
        setGlobalError(`Customer created successfully, but some documents failed to upload: ${failedUploads.join(', ')}. Please retry submitting the remaining documents.`)
        window.scrollTo(0, 0)
        return // Do not show success screen yet
      }

      // 3. Success UI
      const now = new Date()
      const formattedDateTime = now.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
      })
      
      setSubmittedData({
        customerName: formData.fullName,
        mobileNumber: formData.mobileNumber,
        submissionDate: formattedDateTime,
        referenceId: `REF${agentCustomerId}`,
      })

    } catch (err) {
      setGlobalError(err.message || 'An error occurred during submission. Please try again.')
      window.scrollTo(0, 0)
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetForm = () => {
    setSubmittedData(null)
    setCreatedCustomerId(null)
    setUploadedDocuments([])
    setFormData({
      fullName: '',
      mobileNumber: '',
      email: '',
      employmentTypeId: '',
      loanPurposeId: '',
      expectedAmount: '',
      remarks: '',
    })
    setSelectedFiles({})
    setPreviews({})
    setGlobalError(null)
  }

  const handleCancel = () => {
    navigate('/Agent/dashboard')
  }

  if (loadingMasters) {
    return <div className="add-customer"><div style={{padding: '2rem', textAlign: 'center'}}>Loading master data...</div></div>
  }

  return (
    <div className="add-customer">
      {globalError && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #f87171' }}>
          {globalError}
        </div>
      )}

      <form className="add-customer-card" onSubmit={handleSubmit}>
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
                required
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
                required
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
              <label className="form-label" htmlFor="employmentTypeId">
                Employment Type<span className="required-star">*</span>
              </label>
              <select
                id="employmentTypeId"
                name="employmentTypeId"
                className="form-select"
                value={formData.employmentTypeId}
                onChange={handleInputChange}
                required
                disabled={loadingMasters || employmentTypesError}
              >
                <option value="" disabled>
                  {loadingMasters 
                    ? 'Loading employment types...' 
                    : employmentTypesError 
                      ? 'Unable to load employment types. Please try again.' 
                      : employmentTypes.length === 0 
                        ? 'No employment types available' 
                        : 'Select employment type'}
                </option>
                {employmentTypes.map(type => (
                  <option key={type.employmentTypeId || type.id} value={type.employmentTypeId || type.id}>
                    {type.employmentTypeName || type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {formData.employmentTypeId && (
          <div className="form-section">
            <div className="form-section-header">
              <div className="form-section-icon-badge">
                <FileText size={15} strokeWidth={2} />
              </div>
              <h3 className="form-section-title">
                Required Documents {loadingMapping && <span style={{fontSize: '12px', marginLeft: '8px', color: '#666'}}>(Loading required documents...)</span>}
              </h3>
            </div>

            <div className="documents-grid">
              {documentMappings.length === 0 && !loadingMapping && (
                <p style={{ color: '#666', fontSize: '14px', gridColumn: '1 / -1' }}>No documents configured for this employment type.</p>
              )}

              {documentMappings.map(mapping => {
                const docName = mapping.documentTypeName || 'Document'
                const isMultiple = docName.toLowerCase().includes('other')
                const files = selectedFiles[mapping.documentTypeId]
                const hasFile = isMultiple ? (files && files.length > 0) : !!files
                const IconComponent = getDocumentIcon(docName)

                const isUploaded = uploadedDocuments.includes(mapping.documentTypeId)

                return (
                  <div key={mapping.documentTypeId} className={`document-upload-card ${hasFile || isUploaded ? 'has-file' : ''}`}>
                    {isUploaded ? (
                      <div className="file-preview-box" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={18} color="#16a34a" />
                          <div className="file-preview-details" style={{ margin: 0 }}>
                            <span className="file-preview-name" style={{ color: '#166534', fontWeight: 600 }}>Successfully Uploaded</span>
                          </div>
                        </div>
                      </div>
                    ) : hasFile ? (
                      isMultiple ? (
                        <div className="file-preview-box" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                          {files.map((file, index) => (
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
                                onClick={() => handleRemoveFile(mapping.documentTypeId, index)}
                                style={{ padding: '2px 4px', background: 'transparent', border: 'none' }}
                                disabled={submitting}
                              >
                                <Trash2 size={13} color="#ef4444" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="file-preview-box">
                          {previews[mapping.documentTypeId] ? (
                            <img
                              src={previews[mapping.documentTypeId]}
                              alt={`${docName} Preview`}
                              className="thumbnail-preview-img"
                              onClick={() => setModalImage({ src: previews[mapping.documentTypeId], title: docName })}
                            />
                          ) : (
                            <IconComponent size={18} className="document-icon-badge" />
                          )}
                          <div className="file-preview-details">
                            <span className="file-preview-name">{files.name}</span>
                            <span className="file-preview-size">({formatFileSize(files.size)})</span>
                          </div>
                          {previews[mapping.documentTypeId] && (
                            <button
                              type="button"
                              className="action-view"
                              onClick={() => setModalImage({ src: previews[mapping.documentTypeId], title: docName })}
                            >
                              <Eye size={14} />
                            </button>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="document-card-top">
                        <div className="document-icon-badge">
                          <IconComponent size={16} strokeWidth={1.8} />
                        </div>
                        <div className="document-card-info">
                          <h4>{docName}{mapping.isMandatory && <span className="required-star">*</span>}</h4>
                          <p>Upload clear image of {docName}</p>
                          <p className="document-card-subtitle">
                            {isMultiple ? 'Upload multiple files' : 'JPG, PNG or PDF (Max. 10MB)'}
                          </p>
                        </div>
                      </div>
                    )}

                    {!isUploaded && (
                      <div className="file-actions-row">
                        <label className={`file-upload-btn ${submitting ? 'disabled' : ''}`}>
                          <Upload size={13} strokeWidth={2} />
                          <span>{hasFile ? (isMultiple ? 'Add More' : 'Change') : (isMultiple ? 'Choose Files' : 'Upload Document')}</span>
                          <input
                            type="file"
                            multiple={isMultiple}
                            className="file-input-hidden"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileChange(e, mapping.documentTypeId, isMultiple)}
                            disabled={submitting}
                          />
                        </label>
                        {hasFile && !isMultiple && (
                          <button
                            type="button"
                            className="file-remove-btn"
                            onClick={() => handleRemoveFile(mapping.documentTypeId)}
                            disabled={submitting}
                          >
                            <Trash2 size={13} />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="form-section">
          <div className="form-section-header">
            <div className="form-section-icon-badge">
              <CreditCard size={15} strokeWidth={2} />
            </div>
            <h3 className="form-section-title">Loan Requirement</h3>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="loanPurposeId">
                Loan Purpose<span className="required-star">*</span>
              </label>
              <select
                id="loanPurposeId"
                name="loanPurposeId"
                className="form-select"
                value={formData.loanPurposeId}
                onChange={handleInputChange}
                required
                disabled={loadingMasters || loanPurposesError}
              >
                <option value="" disabled>
                  {loadingMasters 
                    ? 'Loading loan purposes...' 
                    : loanPurposesError 
                      ? 'Unable to load loan purposes. Please try again.' 
                      : loanPurposes.length === 0 
                        ? 'No loan purposes available' 
                        : 'Select purpose'}
                </option>
                {loanPurposes.map(purpose => (
                  <option key={purpose.loanPurposeId || purpose.id} value={purpose.loanPurposeId || purpose.id}>
                    {purpose.productName || purpose.name}
                  </option>
                ))}
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
                min="1"
                required
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

        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={handleCancel} disabled={submitting}>
            <X size={15} strokeWidth={2} /> Cancel
          </button>
          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? 'Saving Customer...' : (
              <>Save & Continue to Documents <ArrowRight size={15} strokeWidth={2} /></>
            )}
          </button>
        </div>
      </form>

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
