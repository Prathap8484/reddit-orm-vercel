const text = `Samsung Galaxy A57 5G – Which screen protector and case are actually worth buying?	https://www.reddit.com/r/samsunggalaxy/comments/1ujsihx/samsung_galaxy_a57_5g_which_screen_protector_and/		0	0	6/30/2026
Samsung Galaxy A57 5G – Which screen protector and case are actually worth buying?	https://www.reddit.com/r/GalaxyA57/comments/1ujsb6v/samsung_galaxy_a57_5g_which_screen_protector_and/		0	0	6/30/2026`;

const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
const postsToFilter = [];

for (const line of lines) {
  let cols = line.split('\t');
  if (cols.length < 2) cols = line.split(',');
  
  let title = cols[0];
  let url = cols[1];
  
  if (url && url.includes('reddit.com')) {
    const subMatch = url.match(/\/r\/([^/]+)/);
    const subreddit = subMatch ? subMatch[1] : 'unknown';
    postsToFilter.push({ title, url, subreddit });
  }
}

console.log(postsToFilter);
