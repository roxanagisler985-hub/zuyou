/**
 * 宿友 - 数据管理层
 * 管理收藏、室友数据等（使用localStorage持久化）
 */

const STORAGE_KEYS = {
  FAVORITES: 'zuyou_favorites',
  ROOMMATE_PROFILE: 'zuyou_roommate_profile',
  MATCHED_USERS: 'zuyou_matched_users',
  USER_INFO: 'zuyou_user_info'
};

// ===== 收藏管理 =====
function getFavorites() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '[]');
}

function saveFavorites(list) {
  localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(list));
}

function toggleFavorite(houseId) {
  const favs = getFavorites();
  const idx = favs.indexOf(houseId);
  if (idx > -1) {
    favs.splice(idx, 1);
    saveFavorites(favs);
    return false; // 取消收藏
  } else {
    favs.push(houseId);
    saveFavorites(favs);
    return true; // 收藏成功
  }
}

function isFavorited(houseId) {
  return getFavorites().indexOf(houseId) > -1;
}

// ===== 室友匹配数据 =====
function saveRoommateProfile(profile) {
  localStorage.setItem(STORAGE_KEYS.ROOMMATE_PROFILE, JSON.stringify(profile));
}

function getRoommateProfile() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.ROOMMATE_PROFILE) || 'null');
}

function saveMatchedUsers(users) {
  localStorage.setItem(STORAGE_KEYS.MATCHED_USERS, JSON.stringify(users));
}

function getMatchedUsers() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.MATCHED_USERS) || '[]');
}

function confirmMatch(userId) {
  const confirmed = JSON.parse(localStorage.getItem('zuyou_confirmations') || '[]');
  if (!confirmed.includes(userId)) {
    confirmed.push(userId);
    localStorage.setItem('zuyou_confirmations', JSON.stringify(confirmed));
  }
}

function getConfirmations() {
  return JSON.parse(localStorage.getItem('zuyou_confirmations') || '[]');
}

// ===== 用户信息 =====
function saveUserInfo(info) {
  localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(info));
}

function getUserInfo() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_INFO) || 'null');
}

// ===== Mock匹配用户数据 =====
const MOCK_USERS = [
  { id: 'U001', name: '小林', gender: '女', age: 21, school: '广东工业大学', zodiac: '早睡型', hygiene: '洁癖', personality: '安静', budget: '1000-2000', pets: false, genderPrefer: '女' },
  { id: 'U002', name: '小陈', gender: '女', age: 22, school: '华南师范大学', zodiac: '早睡型', hygiene: '一般', personality: '安静', budget: '1000-2000', pets: false, genderPrefer: '女' },
  { id: 'U003', name: '阿杰', gender: '男', age: 23, school: '岭南师范学院', zodiac: '熬夜型', hygiene: '一般', personality: '健谈', budget: '1500-2500', pets: true, genderPrefer: '不限' },
  { id: 'U004', name: '小王', gender: '男', age: 22, school: '广州大学', zodiac: '自由型', hygiene: '随意', personality: '健谈', budget: '800-1500', pets: false, genderPrefer: '男' },
  { id: 'U005', name: '小美', gender: '女', age: 21, school: '广东药科大学', zodiac: '早睡型', hygiene: '洁癖', personality: '安静', budget: '1200-2000', pets: false, genderPrefer: '女' },
  { id: 'U006', name: '大刘', gender: '男', age: 24, school: '广州理工学院', zodiac: '熬夜型', hygiene: '一般', personality: '都可', budget: '1000-1800', pets: false, genderPrefer: '不限' },
  { id: 'U007', name: '小张', gender: '女', age: 22, school: '岭南师范学院', zodiac: '自由型', hygiene: '一般', personality: '健谈', budget: '800-1500', pets: true, genderPrefer: '不限' },
  { id: 'U008', name: '阿文', gender: '男', age: 23, school: '中山大学', zodiac: '早睡型', hygiene: '洁癖', personality: '安静', budget: '2000-3000', pets: false, genderPrefer: '男' },
];
