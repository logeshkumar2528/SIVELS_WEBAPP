/* Mock data for the KYC verification flow.
   Replace these constants with real API responses during backend integration. */

export const MOCK_AADHAAR = {
  maskedNumber: 'XXXX XXXX 4321',
  name: 'Rahul Sharma',
  dob: '15 Aug 1994',
  gender: 'Male',
  address: '12, MG Road, Indiranagar, Bengaluru, Karnataka - 560001',
  fatherName: 'Suresh Sharma',
  pincode: '560001',
  mobileNumber: '+91 98765 43210',
};

export const MOCK_PAN = {
  number: 'ABCDE1234F',
  name: 'Rahul Sharma',
  type: 'Individual',
};

export const MOCK_FACE = {
  matchScore: 96,
};

export const FACE_INSTRUCTIONS = ['Look Straight', 'Blink Your Eyes', 'Turn Left', 'Turn Right'];
