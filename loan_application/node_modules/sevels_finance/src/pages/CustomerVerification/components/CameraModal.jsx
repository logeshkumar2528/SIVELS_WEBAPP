import { useEffect, useRef, useState } from 'react';
import { Camera, AlertCircle } from 'lucide-react';
import Modal from './Modal';
import Button from '../../../components/common/Button/Button';
import { FACE_INSTRUCTIONS } from '../mockData';

/* Minimum share of the frame the detected face must cover so distant /
   partial faces are rejected. */
const MIN_FACE_RATIO = 0.18;

/**
 * Detects whether the captured frame contains exactly one clearly visible
 * face. Uses the native FaceDetector API when available and falls back to a
 * detail/variance heuristic (rejecting blank, dark or covered frames).
 */
const detectFace = async (canvas) => {
  if ('FaceDetector' in window) {
    try {
      const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 2 });
      const faces = await detector.detect(canvas);
      if (faces.length !== 1) return false;
      const { width } = faces[0].boundingBox;
      return width >= canvas.width * MIN_FACE_RATIO;
    } catch {
      /* Detector unavailable at runtime — use the heuristic below. */
    }
  }
  return hasSufficientDetail(canvas);
};

const hasSufficientDetail = (canvas) => {
  const context = canvas.getContext('2d');
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  let sum = 0;
  let sumOfSquares = 0;
  let samples = 0;

  for (let index = 0; index < data.length; index += 40) {
    const luminance = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
    sum += luminance;
    sumOfSquares += luminance * luminance;
    samples += 1;
  }

  const mean = sum / samples;
  const variance = sumOfSquares / samples - mean * mean;
  return variance > 320 && mean > 25 && mean < 240;
};

const CameraModal = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [phase, setPhase] = useState('loading'); // loading | ready | checking | denied
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isActive = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (!isActive) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setPhase('ready');
      } catch {
        setErrorMessage('Unable to access the camera. Please allow camera permission and try again.');
        setPhase('denied');
      }
    };

    startCamera();

    return () => {
      isActive = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const handleCapture = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 320;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    setPhase('checking');
    setErrorMessage('');

    const faceDetected = await detectFace(canvas);
    if (faceDetected) {
      onCapture(canvas.toDataURL('image/png'));
      return;
    }

    setErrorMessage('No clear face detected. Make sure only your face is centered in the frame, then retake.');
    setPhase('ready');
  };

  const renderFooter = () => {
    if (phase === 'denied') {
      return <Button variant="primary" onClick={onClose}>Close</Button>;
    }
    return (
      <Button
        variant="primary"
        icon={Camera}
        loading={phase === 'checking'}
        disabled={phase !== 'ready'}
        onClick={handleCapture}
      >
        {errorMessage ? 'Retake' : 'Capture'}
      </Button>
    );
  };

  return (
    <Modal
      title="Face Capture"
      subtitle="Position your face inside the frame and follow the on-screen instructions."
      onClose={onClose}
      footer={renderFooter()}
    >
      <div className="kyc-camera">
        <div className="kyc-camera-frame">
          <video ref={videoRef} className="kyc-camera-video" autoPlay playsInline muted />
          {phase !== 'denied' && <span className="kyc-camera-scan" />}
        </div>

        <ul className="kyc-camera-steps">
          {FACE_INSTRUCTIONS.map((instruction) => (
            <li className="kyc-camera-step" key={instruction}>
              <span className="kyc-camera-step-dot" />
              {instruction}
            </li>
          ))}
        </ul>

        {errorMessage && (
          <p className="kyc-camera-error">
            <AlertCircle size={16} />
            {errorMessage}
          </p>
        )}
      </div>

      <canvas ref={canvasRef} className="kyc-camera-canvas" />
    </Modal>
  );
};

export default CameraModal;
