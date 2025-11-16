export const DateUtils = {
  isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  },

  getCurrentDate() {
    return new Date().toISOString().split("T")[0];
  },
};