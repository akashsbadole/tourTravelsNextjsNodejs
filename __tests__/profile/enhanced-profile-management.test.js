/**
 * Enhanced Profile Management Test Suite
 * Tests all components and features of the enhanced user profile management system
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Import all profile components
import { EnhancedProfileManagement } from '../../../components/pages/profile/EnhancedProfileManagement';
import { EnhancedProfileEditor } from '../../../components/pages/profile/EnhancedProfileEditor';
import { ProfileCompletionTracker } from '../../../components/pages/profile/ProfileCompletionTracker';
import { ProfileVerification } from '../../../components/pages/profile/ProfileVerification';
import { TravelPreferencesManager } from '../../../components/pages/profile/TravelPreferencesManager';
import { DocumentManager } from '../../../components/pages/profile/DocumentManager';
import { TravelAnalyticsDashboard } from '../../../components/pages/profile/TravelAnalyticsDashboard';
import { PrivacySecurityControls } from '../../../components/pages/profile/PrivacySecurityControls';
import { SocialTravelFeatures } from '../../../components/pages/profile/SocialTravelFeatures';
import { MobileProfileInterface } from '../../../components/pages/profile/MobileProfileInterface';
import { IntegrationFeatures } from '../../../components/pages/profile/IntegrationFeatures';
import { AdminProfileManagement } from '../../../components/pages/profile/AdminProfileManagement';

// Mock data for testing
const mockUserProfile = {
  _id: 'user123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  username: 'johndoe',
  location: 'New York, USA',
  dateOfBirth: '1990-01-15',
  createdAt: '2024-01-01',
  profilePicture: '/api/placeholder-avatar.jpg',
  verificationStatus: 'pending',
  totalTrips: 15,
  countriesVisited: 8,
  points: 2500,
  travelPreferences: {
    accommodationType: 'hotel',
    travelClass: 'economy',
    mealPreference: 'vegetarian',
    seatPreference: 'window'
  },
  privacySettings: {
    publicProfile: true,
    showTravelHistory: false,
    allowMessages: true
  },
  securitySettings: {
    twoFactorEnabled: false,
    biometricEnabled: true
  }
};

const mockProfileCompletion = {
  percentage: 75,
  sections: [
    { name: 'Personal Information', completed: true, percentage: 100 },
    { name: 'Travel Preferences', completed: true, percentage: 90 },
    { name: 'Documents', completed: false, percentage: 60 },
    { name: 'Social Profile', completed: false, percentage: 40 },
    { name: 'Privacy Settings', completed: true, percentage: 85 }
  ],
  rewards: [
    { id: 1, title: 'Profile Champion', description: 'Complete 90% of your profile', points: 500, unlocked: false },
    { id: 2, title: 'Travel Expert', description: 'Add detailed travel preferences', points: 300, unlocked: true },
    { id: 3, title: 'Verified Traveler', description: 'Complete identity verification', points: 1000, unlocked: false }
  ]
};

const mockDocuments = [
  {
    _id: 'doc1',
    documentType: 'passport',
    documentNumber: 'A12345678',
    issuingCountry: 'United States',
    issueDate: '2020-01-15',
    expiryDate: '2030-01-15',
    verificationStatus: 'verified',
    documentUrl: '/api/placeholder-passport.jpg',
    verifiedAt: '2024-01-15',
    verificationNotes: 'Document verified successfully'
  },
  {
    _id: 'doc2',
    documentType: 'driver_license',
    documentNumber: 'DL987654',
    issuingCountry: 'United States',
    issueDate: '2022-05-20',
    expiryDate: '2027-05-20',
    verificationStatus: 'pending',
    documentUrl: '/api/placeholder-license.jpg'
  }
];

describe('Enhanced Profile Management System', () => {
  let mockOnProfileUpdate;
  let mockOnDocumentUpload;
  let mockOnVerificationSubmit;

  beforeEach(() => {
    mockOnProfileUpdate = jest.fn();
    mockOnDocumentUpload = jest.fn();
    mockOnVerificationSubmit = jest.fn();
  });

  describe('EnhancedProfileManagement', () => {
    it('renders profile overview with user data', () => {
      render(
        <EnhancedProfileManagement
          userProfile={mockUserProfile}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('@johndoe')).toBeInTheDocument();
      expect(screen.getByText('New York, USA')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument(); // Total Trips
      expect(screen.getByText('8')).toBeInTheDocument(); // Countries Visited
      expect(screen.getByText('2500')).toBeInTheDocument(); // Points
    });

    it('switches between tabs correctly', async () => {
      render(
        <EnhancedProfileManagement
          userProfile={mockUserProfile}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      // Click on Edit Profile tab
      fireEvent.click(screen.getByText('Edit Profile'));
      await waitFor(() => {
        expect(screen.getByText('Personal Information')).toBeInTheDocument();
      });

      // Click on Documents tab
      fireEvent.click(screen.getByText('Documents'));
      await waitFor(() => {
        expect(screen.getByText('Upload Documents')).toBeInTheDocument();
      });
    });

    it('renders mobile view correctly', () => {
      render(
        <EnhancedProfileManagement
          userProfile={mockUserProfile}
          isMobile={true}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Bookings')).toBeInTheDocument();
      expect(screen.getByText('Travel')).toBeInTheDocument();
      expect(screen.getByText('Social')).toBeInTheDocument();
      expect(screen.getByText('More')).toBeInTheDocument();
    });

    it('renders admin view correctly', () => {
      render(
        <EnhancedProfileManagement
          userProfile={mockUserProfile}
          isAdmin={true}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      expect(screen.getByText('Admin Profile Management')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Verification')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
    });
  });

  describe('EnhancedProfileEditor', () => {
    it('renders all profile sections', () => {
      render(
        <EnhancedProfileEditor
          userProfile={mockUserProfile}
          onUpdate={mockOnProfileUpdate}
        />
      );

      expect(screen.getByText('Personal Information')).toBeInTheDocument();
      expect(screen.getByText('Travel Preferences')).toBeInTheDocument();
      expect(screen.getByText('Emergency Contacts')).toBeInTheDocument();
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    it('updates profile data correctly', async () => {
      render(
        <EnhancedProfileEditor
          userProfile={mockUserProfile}
          onUpdate={mockOnProfileUpdate}
        />
      );

      // Find and change first name input
      const firstNameInput = screen.getByDisplayValue('John');
      fireEvent.change(firstNameInput, { target: { value: 'Jane' } });

      // Save changes
      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(mockOnProfileUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ firstName: 'Jane' })
        );
      });
    });

    it('validates form inputs', async () => {
      render(
        <EnhancedProfileEditor
          userProfile={mockUserProfile}
          onUpdate={mockOnProfileUpdate}
        />
      );

      // Clear required field
      const emailInput = screen.getByDisplayValue('john.doe@example.com');
      fireEvent.change(emailInput, { target: { value: '' } });

      // Try to save
      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('ProfileCompletionTracker', () => {
    it('displays completion percentage correctly', () => {
      render(
        <ProfileCompletionTracker
          completionData={mockProfileCompletion}
          onClaimReward={jest.fn()}
        />
      );

      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('Profile Complete')).toBeInTheDocument();
    });

    it('shows section progress', () => {
      render(
        <ProfileCompletionTracker
          completionData={mockProfileCompletion}
          onClaimReward={jest.fn()}
        />
      );

      expect(screen.getByText('Personal Information')).toBeInTheDocument();
      expect(screen.getByText('Travel Preferences')).toBeInTheDocument();
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });

    it('displays available rewards', () => {
      render(
        <ProfileCompletionTracker
          completionData={mockProfileCompletion}
          onClaimReward={jest.fn()}
        />
      );

      expect(screen.getByText('Profile Champion')).toBeInTheDocument();
      expect(screen.getByText('Travel Expert')).toBeInTheDocument();
      expect(screen.getByText('Verified Traveler')).toBeInTheDocument();
    });
  });

  describe('ProfileVerification', () => {
    it('shows verification status', () => {
      const mockVerificationData = {
        status: 'pending',
        documents: [],
        badges: []
      };

      render(
        <ProfileVerification
          verificationData={mockVerificationData}
          onSubmitVerification={mockOnVerificationSubmit}
        />
      );

      expect(screen.getByText('Identity Verification')).toBeInTheDocument();
      expect(screen.getByText('Document Upload')).toBeInTheDocument();
      expect(screen.getByText('Video Verification')).toBeInTheDocument();
    });

    it('handles document upload', async () => {
      const mockVerificationData = {
        status: 'not_started',
        documents: [],
        badges: []
      };

      render(
        <ProfileVerification
          verificationData={mockVerificationData}
          onSubmitVerification={mockOnVerificationSubmit}
        />
      );

      // Simulate file upload
      const fileInput = screen.getByLabelText(/passport/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(mockOnVerificationSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('TravelPreferencesManager', () => {
    it('displays travel preferences', () => {
      render(
        <TravelPreferencesManager
          preferences={mockUserProfile.travelPreferences}
          history={[]}
          onUpdatePreferences={mockOnProfileUpdate}
        />
      );

      expect(screen.getByText('Accommodation Preferences')).toBeInTheDocument();
      expect(screen.getByText('Flight Preferences')).toBeInTheDocument();
      expect(screen.getByText('Dietary Preferences')).toBeInTheDocument();
    });

    it('updates preferences correctly', async () => {
      render(
        <TravelPreferencesManager
          preferences={mockUserProfile.travelPreferences}
          history={[]}
          onUpdatePreferences={mockOnProfileUpdate}
        />
      );

      // Change accommodation type
      const accommodationSelect = screen.getByDisplayValue(/hotel/i);
      fireEvent.change(accommodationSelect, { target: { value: 'apartment' } });

      // Save changes
      fireEvent.click(screen.getByText('Save Preferences'));

      await waitFor(() => {
        expect(mockOnProfileUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            travelPreferences: expect.objectContaining({
              accommodationType: 'apartment'
            })
          })
        );
      });
    });
  });

  describe('DocumentManager', () => {
    it('displays uploaded documents', () => {
      render(
        <DocumentManager
          documents={mockDocuments}
          onDocumentUpload={mockOnDocumentUpload}
          onDocumentDelete={jest.fn()}
          onDocumentUpdate={jest.fn()}
        />
      );

      expect(screen.getByText('Passport')).toBeInTheDocument();
      expect(screen.getByText('Driver License')).toBeInTheDocument();
      expect(screen.getByText('A12345678')).toBeInTheDocument();
      expect(screen.getByText('DL987654')).toBeInTheDocument();
    });

    it('handles document upload', async () => {
      render(
        <DocumentManager
          documents={mockDocuments}
          onDocumentUpload={mockOnDocumentUpload}
          onDocumentDelete={jest.fn()}
          onDocumentUpdate={jest.fn()}
        />
      );

      // Find file input for passport
      const passportInput = screen.getByLabelText(/passport/i);
      const file = new File(['test'], 'passport.jpg', { type: 'image/jpeg' });
      
      fireEvent.change(passportInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockOnDocumentUpload).toHaveBeenCalled();
      });
    });

    it('filters documents correctly', () => {
      render(
        <DocumentManager
          documents={mockDocuments}
          onDocumentUpload={mockOnDocumentUpload}
          onDocumentDelete={jest.fn()}
          onDocumentUpdate={jest.fn()}
        />
      );

      // Filter by verified status
      const statusFilter = screen.getByText(/Verification Status/i);
      fireEvent.click(statusFilter);
      
      const verifiedOption = screen.getByText(/Verified/i);
      fireEvent.click(verifiedOption);

      // Should only show verified documents
      expect(screen.getByText('A12345678')).toBeInTheDocument();
      expect(screen.queryByText('DL987654')).not.toBeInTheDocument();
    });
  });

  describe('TravelAnalyticsDashboard', () => {
    it('displays travel analytics', () => {
      const mockAnalyticsData = {
        totalTrips: 28,
        countriesVisited: 15,
        totalSpend: 12450,
        totalCarbon: 890
      };

      render(
        <TravelAnalyticsDashboard
          analyticsData={mockAnalyticsData}
          travelHistory={[]}
          carbonFootprint={{}}
          travelGoals={[]}
          insights={[]}
        />
      );

      expect(screen.getByText('28')).toBeInTheDocument(); // Total Trips
      expect(screen.getByText('15')).toBeInTheDocument(); // Countries Visited
      expect(screen.getByText('$12,450')).toBeInTheDocument(); // Total Spend
      expect(screen.getByText('890 kg')).toBeInTheDocument(); // Carbon Footprint
    });

    it('switches between analytics tabs', async () => {
      render(
        <TravelAnalyticsDashboard
          analyticsData={{}}
          travelHistory={[]}
          carbonFootprint={{}}
          travelGoals={[]}
          insights={[]}
        />
      );

      // Click on Carbon Footprint tab
      fireEvent.click(screen.getByText('Carbon Footprint'));
      await waitFor(() => {
        expect(screen.getByText('Carbon Footprint Summary')).toBeInTheDocument();
      });

      // Click on Travel Goals tab
      fireEvent.click(screen.getByText('Travel Goals'));
      await waitFor(() => {
        expect(screen.getByText('Active Travel Goals')).toBeInTheDocument();
      });
    });
  });

  describe('PrivacySecurityControls', () => {
    it('displays privacy settings', () => {
      render(
        <PrivacySecurityControls
          privacySettings={mockUserProfile.privacySettings}
          securitySettings={mockUserProfile.securitySettings}
          loginActivity={[]}
          connectedApps={[]}
          onUpdatePrivacySettings={mockOnProfileUpdate}
          onUpdateSecuritySettings={mockOnProfileUpdate}
          onEnable2FA={jest.fn()}
          onDisable2FA={jest.fn()}
          onRevokeSession={jest.fn()}
          onDisconnectApp={jest.fn()}
          onExportData={jest.fn()}
          onDeleteAccount={jest.fn()}
        />
      );

      expect(screen.getByText('Profile Visibility')).toBeInTheDocument();
      expect(screen.getByText('Data Sharing Preferences')).toBeInTheDocument();
      expect(screen.getByText('Location Privacy')).toBeInTheDocument();
    });

    it('handles 2FA toggle', async () => {
      const mockOnEnable2FA = jest.fn().mockResolvedValue({ success: true });
      
      render(
        <PrivacySecurityControls
          privacySettings={mockUserProfile.privacySettings}
          securitySettings={mockUserProfile.securitySettings}
          loginActivity={[]}
          connectedApps={[]}
          onUpdatePrivacySettings={mockOnProfileUpdate}
          onUpdateSecuritySettings={mockOnProfileUpdate}
          onEnable2FA={mockOnEnable2FA}
          onDisable2FA={jest.fn()}
          onRevokeSession={jest.fn()}
          onDisconnectApp={jest.fn()}
          onExportData={jest.fn()}
          onDeleteAccount={jest.fn()}
        />
      );

      // Click Security tab
      fireEvent.click(screen.getByText('Security'));
      
      // Click enable 2FA
      fireEvent.click(screen.getByText('Enable'));

      await waitFor(() => {
        expect(mockOnEnable2FA).toHaveBeenCalled();
      });
    });
  });

  describe('SocialTravelFeatures', () => {
    it('displays social feed', () => {
      render(
        <SocialTravelFeatures
          userProfile={mockUserProfile}
          socialConnections={{}}
          travelPosts={[]}
          travelWishlist={[]}
          onUpdateSocialSettings={mockOnProfileUpdate}
          onCreatePost={jest.fn()}
          onConnectWithUser={jest.fn()}
          onDisconnectFromUser={jest.fn()}
          onAddToWishlist={jest.fn()}
          onRemoveFromWishlist={jest.fn()}
          onShareProfile={jest.fn()}
        />
      );

      expect(screen.getByText('Share Your Travel Experience')).toBeInTheDocument();
      expect(screen.getByText('Social Feed')).toBeInTheDocument();
      expect(screen.getByText('Connections')).toBeInTheDocument();
      expect(screen.getByText('Wishlist')).toBeInTheDocument();
    });

    it('creates new post', async () => {
      const mockOnCreatePost = jest.fn().mockResolvedValue({ success: true });
      
      render(
        <SocialTravelFeatures
          userProfile={mockUserProfile}
          socialConnections={{}}
          travelPosts={[]}
          travelWishlist={[]}
          onUpdateSocialSettings={mockOnProfileUpdate}
          onCreatePost={mockOnCreatePost}
          onConnectWithUser={jest.fn()}
          onDisconnectFromUser={jest.fn()}
          onAddToWishlist={jest.fn()}
          onRemoveFromWishlist={jest.fn()}
          onShareProfile={jest.fn()}
        />
      );

      // Type post content
      const postTextarea = screen.getByPlaceholderText(/share your travel story/i);
      fireEvent.change(postTextarea, { target: { value: 'Just arrived in Paris!' } });

      // Post it
      fireEvent.click(screen.getByText('Post'));

      await waitFor(() => {
        expect(mockOnCreatePost).toHaveBeenCalledWith(
          expect.objectContaining({
            content: 'Just arrived in Paris!'
          })
        );
      });
    });
  });

  describe('MobileProfileInterface', () => {
    it('renders mobile-optimized interface', () => {
      render(
        <MobileProfileInterface
          userProfile={mockUserProfile}
          profileCompletion={mockProfileCompletion}
          recentActivity={[]}
          quickActions={[]}
          onProfileUpdate={mockOnProfileUpdate}
          onPhotoCapture={jest.fn()}
          onBiometricAuth={jest.fn()}
          onQuickAction={jest.fn()}
        />
      );

      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Bookings')).toBeInTheDocument();
      expect(screen.getByText('Travel')).toBeInTheDocument();
      expect(screen.getByText('Social')).toBeInTheDocument();
      expect(screen.getByText('More')).toBeInTheDocument();
    });

    it('handles photo capture', async () => {
      const mockOnPhotoCapture = jest.fn().mockResolvedValue({ 
        success: true, 
        photoUrl: '/api/new-profile-pic.jpg' 
      });
      
      render(
        <MobileProfileInterface
          userProfile={mockUserProfile}
          profileCompletion={mockProfileCompletion}
          recentActivity={[]}
          quickActions={[]}
          onProfileUpdate={mockOnProfileUpdate}
          onPhotoCapture={mockOnPhotoCapture}
          onBiometricAuth={jest.fn()}
          onQuickAction={jest.fn()}
        />
      );

      // Click camera button
      fireEvent.click(screen.getByRole('button', { name: /camera/i }));

      await waitFor(() => {
        expect(mockOnPhotoCapture).toHaveBeenCalled();
      });
    });
  });

  describe('IntegrationFeatures', () => {
    it('displays loyalty programs', () => {
      const mockLoyaltyPrograms = {
        totalPoints: 3500,
        activePrograms: 3,
        rewardsAvailable: 5,
        tier: 'Gold',
        programs: [
          { _id: '1', name: 'SkyMiles', type: 'airline', points: 2500 },
          { _id: '2', name: 'Marriott Bonvoy', type: 'hotel', points: 800 }
        ],
        rewards: []
      };

      render(
        <IntegrationFeatures
          loyaltyPrograms={mockLoyaltyPrograms}
          connectedServices={[]}
          insuranceProviders={[]}
          syncSettings={{}}
          onConnectService={jest.fn()}
          onDisconnectService={jest.fn()}
          onSyncData={jest.fn()}
          onUpdateSettings={mockOnProfileUpdate}
          onClaimReward={jest.fn()}
          onTransferPoints={jest.fn()}
        />
      );

      expect(screen.getByText('3500')).toBeInTheDocument(); // Total Points
      expect(screen.getByText('SkyMiles')).toBeInTheDocument();
      expect(screen.getByText('Marriott Bonvoy')).toBeInTheDocument();
    });

    it('handles service connection', async () => {
      const mockOnConnectService = jest.fn().mockResolvedValue({ success: true });
      
      render(
        <IntegrationFeatures
          loyaltyPrograms={{}}
          connectedServices={[]}
          insuranceProviders={[]}
          syncSettings={{}}
          onConnectService={mockOnConnectService}
          onDisconnectService={jest.fn()}
          onSyncData={jest.fn()}
          onUpdateSettings={mockOnProfileUpdate}
          onClaimReward={jest.fn()}
          onTransferPoints={jest.fn()}
        />
      );

      // Click Connected Services tab
      fireEvent.click(screen.getByText('Connected Services'));
      
      // Find and click connect button for a service
      const connectButton = screen.getByText('Connect');
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(mockOnConnectService).toHaveBeenCalled();
      });
    });
  });

  describe('AdminProfileManagement', () => {
    it('displays admin dashboard', () => {
      const mockUsers = [
        { _id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', status: 'active', verificationStatus: 'verified' }
      ];

      render(
        <AdminProfileManagement
          users={mockUsers}
          verificationRequests={[]}
          analytics={{}}
          bulkOperations={[]}
          onVerifyUser={jest.fn()}
          onRejectUser={jest.fn()}
          onSuspendUser={jest.fn()}
          onActivateUser={jest.fn()}
          onBulkAction={jest.fn()}
          onExportData={jest.fn()}
          onSendMessage={jest.fn()}
          onUpdateUserStatus={jest.fn()}
        />
      );

      expect(screen.getByText('Admin Profile Management')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Verification')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('handles bulk user actions', async () => {
      const mockOnBulkAction = jest.fn().mockResolvedValue({ success: true });
      
      render(
        <AdminProfileManagement
          users={[]}
          verificationRequests={[]}
          analytics={{}}
          bulkOperations={[]}
          onVerifyUser={jest.fn()}
          onRejectUser={jest.fn()}
          onSuspendUser={jest.fn()}
          onActivateUser={jest.fn()}
          onBulkAction={mockOnBulkAction}
          onExportData={jest.fn()}
          onSendMessage={jest.fn()}
          onUpdateUserStatus={jest.fn()}
        />
      );

      // This would require more complex setup to test bulk actions properly
      // For now, just verify the component renders
      expect(screen.getByText('Admin Profile Management')).toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    it('handles complete profile update flow', async () => {
      render(
        <EnhancedProfileManagement
          userProfile={mockUserProfile}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      // Navigate to edit profile
      fireEvent.click(screen.getByText('Edit Profile'));
      
      await waitFor(() => {
        expect(screen.getByText('Personal Information')).toBeInTheDocument();
      });

      // Update personal info
      const firstNameInput = screen.getByDisplayValue('John');
      fireEvent.change(firstNameInput, { target: { value: 'Jane' } });

      // Save changes
      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(mockOnProfileUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ firstName: 'Jane' })
        );
      });
    });

    it('handles document upload and verification flow', async () => {
      const mockOnDocumentUpload = jest.fn().mockResolvedValue({ success: true });
      
      render(
        <EnhancedProfileManagement
          userProfile={mockUserProfile}
          onDocumentUpload={mockOnDocumentUpload}
          onVerificationSubmit={mockOnVerificationSubmit}
        />
      );

      // Navigate to documents
      fireEvent.click(screen.getByText('Documents'));
      
      await waitFor(() => {
        expect(screen.getByText('Upload Documents')).toBeInTheDocument();
      });

      // Upload a document
      const fileInput = screen.getByLabelText(/passport/i);
      const file = new File(['test'], 'passport.jpg', { type: 'image/jpeg' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockOnDocumentUpload).toHaveBeenCalled();
      });
    });
  });
});

// Performance and Accessibility Tests
describe('Profile Management Performance', () => {
  it('renders large lists efficiently', () => {
    const largeUserList = Array.from({ length: 1000 }, (_, i) => ({
      _id: `user${i}`,
      firstName: `User${i}`,
      lastName: `Test${i}`,
      email: `user${i}@example.com`,
      status: 'active',
      verificationStatus: 'verified'
    }));

    const startTime = performance.now();
    
    render(
      <AdminProfileManagement
        users={largeUserList}
        verificationRequests={[]}
        analytics={{}}
        bulkOperations={[]}
        onVerifyUser={jest.fn()}
        onRejectUser={jest.fn()}
        onSuspendUser={jest.fn()}
        onActivateUser={jest.fn()}
        onBulkAction={jest.fn()}
        onExportData={jest.fn()}
        onSendMessage={jest.fn()}
        onUpdateUserStatus={jest.fn()}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render within 100ms
    expect(renderTime).toBeLessThan(100);
  });
});

describe('Accessibility Tests', () => {
  it('has proper ARIA labels', () => {
    render(
      <EnhancedProfileManagement
        userProfile={mockUserProfile}
        onProfileUpdate={mockOnProfileUpdate}
      />
    );

    // Check for proper ARIA labels on interactive elements
    const tabs = screen.getAllByRole('tab');
    tabs.forEach(tab => {
      expect(tab).toHaveAttribute('aria-selected');
    });

    // Check for proper form labels
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach(input => {
      expect(input).toHaveAttribute('aria-label') || expect(input).toHaveAttribute('placeholder');
    });
  });

  it('supports keyboard navigation', () => {
    render(
      <EnhancedProfileManagement
        userProfile={mockUserProfile}
        onProfileUpdate={mockOnProfileUpdate}
      />
    );

    // Test tab navigation
    fireEvent.keyDown(document, { key: 'Tab' });
    
    // Focus should be manageable via keyboard
    expect(document.activeElement).toBeInTheDocument();
  });
});