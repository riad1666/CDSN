'use client';

import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export default function DebugPage() {
  const { userData, user } = useAuth();
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [dataCounts, setDataCounts] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.currentGroupId) {
        setLoading(false);
        return;
    }

    const groupId = userData.currentGroupId;

    async function checkData() {
      const gRef = doc(db, 'groups', groupId);
      const gSnap = await getDoc(gRef);
      setGroupInfo(gSnap.exists() ? gSnap.data() : { error: 'Group Not Found' });

      const cols = ['expenses', 'shopping', 'settlements', 'cookingSchedules', 'notices'];
      const counts: any = {};
      
      for (const col of cols) {
        const q = query(collection(db, col), where('groupId', '==', groupId));
        const s = await getDocs(q);
        counts[col] = s.size;
      }
      setDataCounts(counts);
      setLoading(false);
    }

    checkData();
  }, [userData]);

  if (!user) return <div className="p-10 text-white">Not Logged In</div>;

  return (
    <div className="p-10 bg-[#0f101a] min-h-screen text-white font-mono">
      <h1 className="text-2xl font-bold mb-4">🔍 Client-Side Debugger</h1>
      
      <section className="mb-6 p-4 border border-white/10 rounded">
        <h2 className="text-primary font-bold">User Info</h2>
        <pre>{JSON.stringify({ 
            uid: user.uid, 
            email: user.email, 
            currentGroupId: userData?.currentGroupId,
            groupsJoined: userData?.groupsJoined 
        }, null, 2)}</pre>
      </section>

      <section className="mb-6 p-4 border border-white/10 rounded text-green-400">
        <h2 className="font-bold">Active Group Info</h2>
        <pre>{JSON.stringify(groupInfo, null, 2)}</pre>
      </section>

      <section className="p-4 border border-white/10 rounded text-yellow-400">
        <h2 className="font-bold">Firestore Data Counts (Client-Side Query)</h2>
        {loading ? <p>Loading...</p> : (
            <pre>{JSON.stringify(dataCounts, null, 2)}</pre>
        )}
      </section>

      <div className="mt-10 text-white/40 text-sm">
        If Counts are 0 here but counts in Audit were 3/10/14, then Firestore Security Rules are blocking the client.
      </div>
    </div>
  );
}
