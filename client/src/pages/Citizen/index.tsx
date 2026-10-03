import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Placeholder components for the 8 pages
import Home from './Home';
import RequestPickup from './RequestPickup';
import MyRequests from './MyRequests';
import CitizenMap from './CitizenMap';
import EcoRewards from './EcoRewards';
import SortingGuide from './SortingGuide';
import ReportIssue from './ReportIssue';
import Profile from './Profile';
import OnboardingTour from '@/components/Citizen/OnboardingTour';

export default function CitizenRouter({ data }) {
  return (
    <>
    <OnboardingTour />
    <Routes>
      <Route path="/" element={<Home data={data} />} />
      <Route path="/request" element={<RequestPickup data={data} />} />
      <Route path="/requests" element={<MyRequests data={data} />} />
      <Route path="/map" element={<CitizenMap data={data} />} />
      <Route path="/rewards" element={<EcoRewards data={data} />} />
      <Route path="/sorting" element={<SortingGuide data={data} />} />
      <Route path="/report" element={<ReportIssue data={data} />} />
      <Route path="/profile" element={<Profile data={data} />} />
      <Route path="*" element={<Navigate to="/citizen" />} />
    </Routes>
    </>
  );
}
