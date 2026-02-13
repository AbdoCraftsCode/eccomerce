export const fillMissingDays = (data, totalDays) => {
    const map = new Map();
  
    data.forEach(d => {
      map.set(d.day, d);
    });
  
    const result = [];
  
    for (let day = 1; day <= totalDays; day++) {
      result.push({
        day,
        val: map.get(day)?.val || 0,
        users: map.get(day)?.users || 0,
      });
    }
  
    return result;
  };
  