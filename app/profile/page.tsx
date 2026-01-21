'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sb } from '@/lib/supabaseBrowser';
import Loading from '@/components/Loading';
import PhoneVerificationModal from './components/PhoneVerificationModal';
import EmailVerificationModal from './components/EmailVerificationModal';
import MerchantNotificationsModal from './components/MerchantNotificationsModal';
import ResetPasswordModal from './components/ResetPasswordModal';
import WelcomeNameModal from './components/WelcomeNameModal';

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [savedCents, setSavedCents] = useState<number>(0);
  const [myTowns, setMyTowns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [enabledMerchants, setEnabledMerchants] = useState<string[]>([]);

  // Modal states
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [merchantModalOpen, setMerchantModalOpen] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);

  // Name editing state
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  const handleUpdateName = async () => {
    if (!tempName.trim()) return;

    try {
      const { error } = await sb
        .from('profiles')
        .update({ first_name: tempName.trim() })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile({ ...profile, first_name: tempName.trim() });
      setEditingName(false);
    } catch (error) {
      console.error('Error updating name:', error);
      alert('Failed to update name. Please try again.');
    }
  };

  useEffect(() => {
    const loadProfile = async (silent = false) => {
      if (!silent) setLoading(true);

      const { data: { user } } = await sb.auth.getUser();
      setUser(user);

      if (user) {
        // Fetch total savings
        const { data: savingsRow } = await sb
          .from('user_savings')
          .select('total_savings_cents')
          .eq('user_id', user.id)
          .single();

        if (savingsRow) {
          setSavedCents(Number(savingsRow.total_savings_cents) || 0);
        }

        // Fetch profile data
        const { data: profileData } = await sb
          .from('profiles')
          .select('first_name, phone, email, phone_verified, email_verified, notification_method, notifications_enabled, subscribed_towns')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileData) {
          setProfile(profileData);

          // Auto-populate phone from Supabase auth if not set
          if (user.phone && !profileData.phone) {
            await sb
              .from('profiles')
              .update({ phone: user.phone, phone_verified: true })
              .eq('user_id', user.id);

            profileData.phone = user.phone;
            profileData.phone_verified = true;
          }
          // Auto-verify phone if it matches Supabase auth phone
          else if (user.phone && profileData.phone === user.phone && !profileData.phone_verified) {
            await sb
              .from('profiles')
              .update({ phone_verified: true })
              .eq('user_id', user.id);

            profileData.phone_verified = true;
          }

          // Auto-populate email from Supabase auth if not set
          if (user.email && !profileData.email) {
            await sb
              .from('profiles')
              .update({ email: user.email, email_verified: true })
              .eq('user_id', user.id);

            profileData.email = user.email;
            profileData.email_verified = true;
          }
          // Auto-verify email if it matches Supabase auth email
          else if (user.email && profileData.email === user.email && !profileData.email_verified) {
            // Mark as verified since Supabase already verified it
            await sb
              .from('profiles')
              .update({ email_verified: true })
              .eq('user_id', user.id);

            profileData.email_verified = true;
          }

          // Fetch full town data for subscribed towns
          if (profileData.subscribed_towns && Array.isArray(profileData.subscribed_towns) && profileData.subscribed_towns.length > 0) {
            const { data: townsData } = await sb
              .from('towns')
              .select('id, name, slug, image_url')
              .in('slug', profileData.subscribed_towns);

            if (townsData) {
              setMyTowns(townsData);
            }
          } else {
            setMyTowns([]);
          }
        }

        // Fetch enabled merchants for notifications
        // We need to join with merchants table to get names
        // Assuming notification_preferences has merchant_id
        const { data: prefs } = await sb
          .from('notification_preferences')
          .select('merchant_id, merchants(name)')
          .eq('user_id', user.id)
          .eq('enabled', true);

        if (prefs) {
          // Flatten the structure to just get an array of names
          // @ts-ignore - Supabase type inference might differ slightly
          const names = prefs.map(p => p.merchants?.name).filter(Boolean);
          setEnabledMerchants(names);
        }
      }

      if (!silent) setLoading(false);
    };

    loadProfile();

    // Refresh profile data when user returns to the page
    const handleFocus = () => {
      // Pass silent=true so we don't show the loading spinner
      loadProfile(true);
    };

    const handleBackgroundRefresh = () => {
      loadProfile(true);
    };

    window.addEventListener('focus', handleFocus);
    // Also listen for a custom event we might fire from the modal
    window.addEventListener('notifications-updated', handleBackgroundRefresh);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('notifications-updated', handleBackgroundRefresh);
    };
  }, [refreshKey]);

  // Notification state
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [resetPasswordMessage, setResetPasswordMessage] = useState<string | undefined>(undefined);

  const handleToggleNotifications = async () => {
    try {
      if (!user || !profile) return;

      // Guard: Cannot enable notifications if not subscribed to any towns
      if (myTowns.length === 0 && !profile.notifications_enabled) {
        setNotificationMsg({ type: 'error', text: 'Please subscribe to a town first to enable notifications.' });
        return;
      }

      setNotificationMsg(null);

      const newState = !profile.notifications_enabled;
      console.log('Toggling notifications to:', newState);

      // If turning off, just disable
      if (!newState) {
        const { error } = await sb
          .from('profiles')
          .update({ notifications_enabled: false })
          .eq('user_id', user.id);

        if (error) {
          console.error('Supabase update error:', error);
          setNotificationMsg({ type: 'error', text: 'Failed to disable notifications. Please try again.' });
          return;
        }

        setProfile({ ...profile, notifications_enabled: false });
        return;
      }

      // If turning on, enable immediately
      const { error } = await sb
        .from('profiles')
        .update({ notifications_enabled: true })
        .eq('user_id', user.id);

      if (error) {
        console.error('Supabase update error:', error);
        setNotificationMsg({ type: 'error', text: 'Failed to enable notifications. Please try again.' });
        return;
      }

      setProfile({ ...profile, notifications_enabled: true });
    } catch (error: any) {
      console.error('Error in handleToggleNotifications:', error);
      setNotificationMsg({ type: 'error', text: 'An unexpected error occurred.' });
    }
  };

  const handleClickMethod = async (method: 'phone' | 'email') => {
    try {
      console.log('Clicking method:', method);
      setNotificationMsg(null);

      if (!user) {
        console.error('User not found');
        return;
      }

      // Check if contact info exists and is verified
      // We do this check BEFORE calling the API
      if (method === 'phone') {
        if (!profile?.phone) {
          setNotificationMsg({ type: 'error', text: 'Please add a phone number to use SMS notifications.' });
          setPhoneModalOpen(true);
          return;
        }
        if (!profile?.phone_verified) {
          setNotificationMsg({ type: 'error', text: 'Please verify your phone number first.' });
          setPhoneModalOpen(true);
          return;
        }
      } else if (method === 'email') {
        if (!profile?.email) {
          setNotificationMsg({ type: 'error', text: 'Please add an email address to use email notifications.' });
          setEmailModalOpen(true);
          return;
        }
        if (!profile?.email_verified) {
          setNotificationMsg({ type: 'error', text: 'Please verify your email first.' });
          setEmailModalOpen(true);
          return;
        }
      }

      // If we are already on this method, just return (or we could show a "Already active" msg)
      if (profile?.notification_method === method) {
        return;
      }

      // Update method via API
      const { data: { session } } = await sb.auth.getSession();
      if (!session) {
        setNotificationMsg({ type: 'error', text: 'Session expired. Please sign in again.' });
        return;
      }

      const response = await fetch('/api/notifications/update-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ method })
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('API Error:', data.error);
        setNotificationMsg({ type: 'error', text: data.error || 'Failed to update method' });

        // If the API says verify first, open the modal
        if (data.error?.includes('verify')) {
          if (method === 'phone') setPhoneModalOpen(true);
          if (method === 'email') setEmailModalOpen(true);
        }
        return;
      }

      const result = await response.json();
      console.log('Update success:', result);

      setProfile({ ...profile, notification_method: method });
      setNotificationMsg({ type: 'success', text: `Notifications set to ${method === 'phone' ? 'SMS' : 'Email'}` });

    } catch (error: any) {
      console.error('Error in handleClickMethod:', error);
      setNotificationMsg({ type: 'error', text: 'An unexpected error occurred.' });
    }
  };

  const handleUnsubscribe = async (townSlug: string) => {
    if (!confirm('Are you sure you want to unsubscribe from this area?')) return;

    const { data: { user } } = await sb.auth.getUser();
    if (!user || !profile) return;

    try {
      // Remove from subscribed_towns array
      const newSubscribedTowns = (profile.subscribed_towns || []).filter((s: string) => s !== townSlug);

      const { error } = await sb
        .from('profiles')
        .update({ subscribed_towns: newSubscribedTowns })
        .eq('user_id', user.id);

      if (error) throw error;

      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      alert('Failed to unsubscribe: ' + err.message);
    }
  };

  const handleSignOut = async () => {
    await sb.auth.signOut();
    router.push('/');
  };

  const handleResetPassword = () => {
    if (!user) return;
    setResetPasswordModalOpen(true);
  };

  if (loading) return <Loading message="Loading Profile..." />;

  if (!user) {
    router.push('/signin');
    return null;
  }

  return (
    <main className="min-h-screen bg-[#0A0F13] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-400 hover:text-white mb-4 flex items-center gap-2"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold">My Profile</h1>
        </div>


        {/* Profile Info */}
        <div className="bg-[#13202B] rounded-2xl p-6 ring-1 ring-white/10 shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-white/60 mb-1">Name</p>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[0-9]/g, ''); // Remove numbers
                      // Capitalize first letter
                      const capitalized = val.charAt(0).toUpperCase() + val.slice(1);
                      setTempName(capitalized);
                    }}
                    maxLength={20}
                    className="bg-white/5 border border-white/20 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                  <button
                    onClick={handleUpdateName}
                    className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <p className="text-lg font-medium">{profile?.first_name || 'User'}</p>
                  <button
                    onClick={() => {
                      setTempName(profile?.first_name || '');
                      setEditingName(true);
                    }}
                    className="text-white/30 hover:text-emerald-400 transition-colors"
                    title="Edit name"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                      <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-white/60">Total Saved</p>
              <p className="text-2xl font-bold text-emerald-400">${(savedCents / 100).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-[#13202B] rounded-2xl p-6 ring-1 ring-white/10 shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Contact Information</h2>

          {/* Phone */}
          <div className="mb-4 pb-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60 mb-1">Phone Number</p>
                {profile?.phone ? (
                  <div className="flex items-center gap-2">
                    <p className="text-base">{profile.phone}</p>
                    {profile.phone_verified ? (
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Verified</span>
                    ) : (
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Not Verified</span>
                    )}
                  </div>
                ) : (
                  <p className="text-white/40">Not added</p>
                )}
              </div>
              <button
                onClick={() => setPhoneModalOpen(true)}
                className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
              >
                {profile?.phone ? 'Change' : 'Add'}
              </button>
            </div>
          </div>

          {/* Email */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60 mb-1">Email Address</p>
                {profile?.email ? (
                  <div className="flex items-center gap-2">
                    <p className="text-base">{profile.email}</p>
                    {profile.email_verified ? (
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Verified</span>
                    ) : (
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Not Verified</span>
                    )}
                  </div>
                ) : (
                  <p className="text-white/40">Not added</p>
                )}
              </div>
              {/* Change email disabled by request, only allow Add if missing */}
              {!profile?.email && (
                <button
                  onClick={() => setEmailModalOpen(true)}
                  className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
                >
                  Add
                </button>
              )}
            </div>
          </div>
          {/* Connected Accounts - Only show if OAuth providers exist */}
          {(user?.identities || []).filter((id: any) => id.provider !== 'email' && id.provider !== 'phone').length > 0 && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-sm text-white/60 mb-3">Connected Accounts</p>
              <div className="space-y-3">
                {(user?.identities || [])
                  .filter((id: any) => id.provider !== 'email' && id.provider !== 'phone')
                  .map((identity: any) => (
                    <div key={identity.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="capitalize font-medium">{identity.provider}</div>
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Connected</span>
                      </div>

                      {/* Disconnect disabled by request */}
                      {/* <button className="text-white/20 text-sm cursor-not-allowed" disabled>Disconnect</button> */}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-[#13202B] rounded-2xl p-6 ring-1 ring-white/10 shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Notifications</h2>

          {/* Feedback Message */}
          {notificationMsg && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${notificationMsg.type === 'error' ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
              {notificationMsg.text}
            </div>
          )}

          {/* Toggle */}
          <div className={`flex items-center justify-between p-4 bg-white/5 rounded-lg mb-4 ${myTowns.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div>
              <p className="font-medium">Enable Notifications</p>
              <p className="text-sm text-white/50">
                {myTowns.length === 0
                  ? "You must be subscribed to a town to enable notifications"
                  : "Get alerts for new deals"}
              </p>
            </div>
            <label className={`relative inline-flex items-center ${myTowns.length === 0 ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                checked={profile?.notifications_enabled || false}
                onChange={handleToggleNotifications}
                disabled={myTowns.length === 0}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Method Selection - Only visible if enabled */}
          {profile?.notifications_enabled && myTowns.length > 0 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-white/60 mb-2">Notification Method</p>
                <div className="space-y-2">
                  {/* Phone Option */}
                  <div
                    onClick={() => handleClickMethod('phone')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${profile?.notification_method === 'phone' ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${profile?.notification_method === 'phone' ? 'border-emerald-500' : 'border-white/30'}`}>
                        {profile?.notification_method === 'phone' && <div className="w-2 h-2 bg-emerald-500 rounded-full" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">Phone (SMS)</p>
                        {(!profile?.phone || !profile?.phone_verified) && (
                          <p className="text-amber-400 text-xs">Setup required</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Email Option */}
                  <div
                    onClick={() => handleClickMethod('email')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${profile?.notification_method === 'email' ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${profile?.notification_method === 'email' ? 'border-emerald-500' : 'border-white/30'}`}>
                        {profile?.notification_method === 'email' && <div className="w-2 h-2 bg-emerald-500 rounded-full" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">Email</p>
                        {(!profile?.email || !profile?.email_verified) && (
                          <p className="text-amber-400 text-xs">Setup required</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Merchant Alerts Summary */}
              {myTowns.length > 0 && (
                <div className="mt-8 pt-6 border-t border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">Merchant Alerts</h3>
                    {enabledMerchants.length > 0 && (
                      <button
                        onClick={() => setMerchantModalOpen(true)}
                        className="text-sm px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors font-medium border border-emerald-500/20"
                      >
                        Manage Alerts
                      </button>
                    )}
                  </div>

                  {enabledMerchants.length > 0 ? (
                    <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                      <p className="text-sm text-white/50 mb-2">You will receive notifications from these business whenever they post a deal</p>
                      <div className="flex flex-wrap gap-2">
                        {enabledMerchants.map((merchantName, idx) => (
                          <span key={idx} className="text-sm text-white bg-white/10 px-2 py-1 rounded">
                            {merchantName}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20 flex flex-col md:flex-row gap-4 items-start md:items-center">
                      <div className="flex-1">
                        <p className="text-amber-200 font-medium mb-1">No alerts configured</p>
                        <p className="text-amber-200/70 text-sm">
                          You won't receive any notifications until you choose which merchants to follow.
                        </p>
                      </div>
                      <button
                        onClick={() => setMerchantModalOpen(true)}
                        className="whitespace-nowrap bg-amber-500 hover:bg-amber-600 text-black font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                      >
                        Configure Alerts
                      </button>
                    </div>
                  )}
                </div>
              )}

              {myTowns.length === 0 && (
                <p className="text-sm text-white/50 text-center py-2">
                  Subscribe to a town from the <a href="/areas" className="text-emerald-400 underline">Areas page</a> to manage merchant alerts
                </p>
              )}
            </div>
          )}
        </div>

        {/* Subscribed Towns */}
        <div className="bg-[#13202B] rounded-2xl p-6 ring-1 ring-white/10 shadow-md">
          <h2 className="text-xl font-semibold mb-4">Subscribed Towns</h2>
          {myTowns.length === 0 ? (
            <p className="text-white/50 text-sm">
              You are not subscribed to any towns.{' '}
              <a href="/areas" className="text-emerald-400 underline">Browse towns</a>
            </p>
          ) : (
            <div className="space-y-3">
              {myTowns.map(town => (
                <div key={town.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <span className="font-medium">{town.name}</span>
                  <button
                    onClick={() => handleUnsubscribe(town.slug)}
                    className="text-red-400 hover:text-red-300 text-sm font-medium"
                  >
                    Unsubscribe
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={handleResetPassword}
            className="text-sm text-gray-400 hover:text-white underline transition-colors"
          >
            Reset/Set Password
          </button>

          <button
            onClick={handleSignOut}
            className="px-6 py-2 rounded-lg bg-white/5 text-red-400 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 transition-all text-sm font-semibold"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Modals */}
      <WelcomeNameModal
        open={!!user && !loading && !profile?.first_name}
        userId={user?.id}
        onSuccess={(newName) => {
          setProfile({ ...profile, first_name: newName });
        }}
      />
      <PhoneVerificationModal
        open={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
        onSuccess={() => {
          setPhoneModalOpen(false);
          setRefreshKey(prev => prev + 1);
        }}
      />
      <EmailVerificationModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSuccess={() => {
          setEmailModalOpen(false);
          setRefreshKey(prev => prev + 1);
        }}
      />
      <MerchantNotificationsModal
        open={merchantModalOpen}
        onClose={() => setMerchantModalOpen(false)}
        subscribedTowns={myTowns}
      />
      <ResetPasswordModal
        isOpen={resetPasswordModalOpen}
        onClose={() => {
          setResetPasswordModalOpen(false);
          setResetPasswordMessage(undefined);
        }}
        user={user}
        profile={profile}
        initialMessage={resetPasswordMessage}
        onSuccess={() => setRefreshKey(prev => prev + 1)}
      />
    </main>
  );
}
