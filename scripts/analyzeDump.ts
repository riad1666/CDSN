import * as fs from 'fs';

try {
  const data = JSON.parse(fs.readFileSync('db_dump.json', 'utf8'));

  const output = [];
  output.push(`--- GROUPS ANALYSIS ---`);
  data.groups.forEach((g: any) => {
    output.push(`Group: ${g.id} ("${g.name}") - Members: ${g.memberIds?.length || 0}`);
  });

  output.push(`\n--- DATA COLLECTIONS ANALYSIS ---`);
  
  for (const [colName, items] of Object.entries(data.collections)) {
    const list = items as any[];
    output.push(`\nCollection: ${colName} (Total: ${list.length})`);
    
    const groupCounts: Record<string, number> = {};
    list.forEach(i => {
      const gid = i.groupId || 'NO_GROUP_ID';
      groupCounts[gid] = (groupCounts[gid] || 0) + 1;
    });

    Object.entries(groupCounts).forEach(([gid, count]) => {
      output.push(`  -> ${gid}: ${count} items`);
    });
  }

  fs.writeFileSync('dump_analysis.txt', output.join('\n'), 'utf8');
  console.log("Analysis written to dump_analysis.txt");
} catch (e) {
  console.error("Error:", e);
}
