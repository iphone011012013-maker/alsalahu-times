// أسماء الصلوات
const prayerDisplayNames = {
  Fajr: "الفجر",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء",
};

const prayerKeys = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

// حالة التنبيه
let adhanEnabled = false;

// منع تكرار التشغيل
let lastAdhanPlayedFor = null;

// منع تعدد المؤقتات
let timerId = null;

// ===============================
// طلب الموقع الجغرافي
// ===============================
function initApp() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchPrayerTimes(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        alert("لم نتمكن من تحديد موقعك تلقائياً. سيتم عرض مواقيت القاهرة.");
        fetchPrayerTimes(30.0444, 31.2357);
      }
    );
  }
}

// ===============================
// جلب المواقيت
// ===============================
async function fetchPrayerTimes(lat, lng) {
  try {
    const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=5`);

    const data = await res.json();
    const timings = data.data.timings;

    document.getElementById("city").innerText = data.data.meta.timezone.split("/")[1] || "مدينتك";

    document.getElementById("date-display").innerText = `${data.data.date.readable} | ${data.data.date.hijri.day} ${data.data.date.hijri.month.ar}`;

    updateUI(timings);
    startTimer(timings);
  } catch (error) {
    console.error("خطأ في الاتصال بالخدمة", error);
  }
}

// ===============================
// تحديث واجهة العرض
// ===============================
function updateUI(timings) {
  prayerKeys.forEach((p) => {
    document.getElementById(p).innerText = timings[p];
  });
}

// ===============================
// تشغيل المؤقت
// ===============================
function startTimer(timings) {
  const audio = document.getElementById("adhan-audio");

  // منع تشغيل أكثر من مؤقت
  if (timerId) clearInterval(timerId);

  timerId = setInterval(() => {
    const now = new Date();
    let next = null;

    // تحديد الصلاة القادمة
    for (let key of prayerKeys) {
      const [h, m] = timings[key].split(":");

      const pTime = new Date();
      pTime.setHours(parseInt(h), parseInt(m), 0, 0);

      if (pTime > now) {
        next = { name: key, time: pTime };
        break;
      }
    }

    // إذا انتهت صلوات اليوم
    if (!next) {
      const [h, m] = timings["Fajr"].split(":");

      const pTime = new Date();
      pTime.setDate(pTime.getDate() + 1);
      pTime.setHours(parseInt(h), parseInt(m), 0, 0);

      next = { name: "Fajr", time: pTime };
    }

    // الحسابات
    const diff = next.time - now;

    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    // تحديث العرض
    document.getElementById("next-prayer-name").innerText = prayerDisplayNames[next.name];

    document.getElementById("countdown").innerText = `${String(hrs).padStart(2, "0")}:` + `${String(mins).padStart(2, "0")}:` + `${String(secs).padStart(2, "0")}`;

    // تفعيل البطاقة
    document.querySelectorAll(".prayer-card").forEach((c) => c.classList.remove("active"));

    document.getElementById(`card-${next.name}`).classList.add("active");

    // ===============================
    // 🔔 تشغيل الأذان مرة واحدة فقط
    // ===============================
    if (diff <= 1000 && adhanEnabled && lastAdhanPlayedFor !== next.name) {
      lastAdhanPlayedFor = next.name;

      audio.currentTime = 0;
      audio.play().catch((e) => console.log("خطأ في تشغيل الصوت:", e));
    }
  }, 1000);
}

// ===============================
// زر التفعيل
// ===============================
document.getElementById("audio-toggle").addEventListener("click", function () {
  adhanEnabled = !adhanEnabled;

  this.classList.toggle("active", adhanEnabled);

  this.innerText = adhanEnabled ? "🔕 تعطيل التنبيه" : "🔔 تشغيل التنبيه";

  if (adhanEnabled) {
    alert("تم تفعيل التنبيه بنجاح. سيعمل الأذان في الصلاة القادمة.");
  }
});

// ===============================
// بدء التطبيق
// ===============================
initApp();
