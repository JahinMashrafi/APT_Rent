import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Register() {
  const [role, setRole] = useState('tenant'); 
  const [occupation, setOccupation] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '', address: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOccupationChange = (e) => {
    const value = e.target.value;
    setOccupation(value);
    if (value !== 'student') {
      setInstitutionName('');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const address = formData.address.trim();
    const institution = institutionName.trim();

    if (!firstName || !lastName || !email || !phone || !formData.password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (occupation === 'student' && !institution) {
      setError('Please enter your institution name.');
      return;
    }

    const payload = {
      firstName,
      lastName,
      email,
      phone,
      password: formData.password,
      address,
      occupation,
      institutionName: institution,
      is_tenant: role === 'tenant',
      is_landlord: role === 'landlord',
    };

    try {
      setIsSubmitting(true);
      const response = await axios.post(
        'http://localhost:5000/api/auth/register',
        payload,
        { withCredentials: true }
      );

      if (response.data?.status === 'success') {
        navigate('/');
      } else {
        setError(response.data?.message || 'Registration failed');
      }
    } catch (err) {
      const validationErrors = err.response?.data?.errors;
      const firstValidationError = Array.isArray(validationErrors)
        ? validationErrors[0]
        : null;

      if (firstValidationError?.message) {
        setError(firstValidationError.message);
      } else {
        setError(err.response?.data?.message || 'Registration failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans w-full">
      
      <section className="hidden lg:flex lg:w-1/3 bg-blue-900 text-white flex-col justify-between p-12">
        <Link to="/" className="flex items-center gap-3">
          <img src="/assets/images/logo/apt-rent-logo.png" alt="APT Rent logo" className="h-10 w-auto" />
          <span className="text-2xl font-bold tracking-tight">APT Rent</span>
        </Link>
        <div className="space-y-6">
          <h2 className="text-4xl font-semibold leading-tight">One profile, verified once, used everywhere.</h2>
        </div>
        <p className="text-xs font-mono tracking-widest text-blue-400">APT RENT // NEW ACCOUNT</p>
      </section>

      <section className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 sm:p-10 border border-gray-100">
          
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Register</h1>
            <p className="text-gray-500 mt-2">Tell us who you are — this becomes your verified APT Rent profile.</p>
          </header>

          <div className="grid grid-cols-2 bg-gray-100 rounded-lg p-1 mb-8">
            <button
              type="button"
              onClick={() => setRole('tenant')}
              aria-pressed={role === 'tenant'}
              className={`text-center py-2.5 rounded-md text-sm font-semibold transition-colors ${
                role === 'tenant' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              I'm a Tenant
            </button>
            <button
              type="button"
              onClick={() => setRole('landlord')}
              aria-pressed={role === 'landlord'}
              className={`text-center py-2.5 rounded-md text-sm font-semibold transition-colors ${
                role === 'landlord' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              I'm a Landlord
            </button>
          </div>

          <form onSubmit={handleRegister} className="space-y-6" noValidate>
            {error && (
              <div role="alert" className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="firstName" className="text-sm font-semibold text-gray-700">First name <span className="text-red-500">*</span></label>
                <input 
                  id="firstName"
                  type="text" name="firstName" value={formData.firstName} onChange={handleInputChange}
                  autoComplete="given-name"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="lastName" className="text-sm font-semibold text-gray-700">Last name <span className="text-red-500">*</span></label>
                <input 
                  id="lastName"
                  type="text" name="lastName" value={formData.lastName} onChange={handleInputChange}
                  autoComplete="family-name"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="phone" className="text-sm font-semibold text-gray-700">Contact number <span className="text-red-500">*</span></label>
                <input 
                  id="phone"
                  type="tel" name="phone" value={formData.phone} onChange={handleInputChange}
                  autoComplete="tel"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-semibold text-gray-700">Email address <span className="text-red-500">*</span></label>
                <input 
                  id="email"
                  type="email" name="email" value={formData.email} onChange={handleInputChange}
                  autoComplete="email"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-gray-700">Password <span className="text-red-500">*</span></label>
              <input 
                id="password"
                type="password" name="password" value={formData.password} onChange={handleInputChange}
                autoComplete="new-password"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="address" className="text-sm font-semibold text-gray-700">Address</label>
              <input 
                id="address"
                type="text" name="address" value={formData.address} onChange={handleInputChange}
                autoComplete="street-address"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>

            <hr className="border-gray-200" />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="occupation" className="text-sm font-semibold text-gray-700">Occupation</label>
              <select 
                id="occupation"
                value={occupation} onChange={handleOccupationChange}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none cursor-pointer"
              >
                <option value="">Select occupation</option>
                <option value="student">Student</option>
                <option value="service">Service holder</option>
                <option value="business">Businessman</option>
              </select>
            </div>

            {occupation === 'student' && (
              <div className="flex flex-col gap-1.5 animate-fade-in">
                <label htmlFor="institutionName" className="text-sm font-semibold text-gray-700">Institution Name</label>
                <input 
                  id="institutionName"
                  type="text"
                  name="institutionName"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="University name"
                  autoComplete="organization"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
            )}

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg shadow-sm active:scale-[0.98] transition-all mt-4"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-800 hover:underline">
              Log in
            </Link>
          </div>

        </div>
      </section>
    </div>
  );
}