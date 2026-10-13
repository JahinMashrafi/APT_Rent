const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const monthLabel = (date) => `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
const isoDate = (date) => date.toISOString().slice(0, 10);

module.exports = { monthLabel, isoDate };