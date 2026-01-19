    // --- Configuration ---
    const WA_NUMBER = "6281274852534"; // Ganti dengan nomor WhatsApp Anda
    const BRAND = "Tama Andrea Studio";
    const START_PRICE = "Rp 10.000";

    // --- Helper Functions ---
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    
    // --- Custom Loader ---
    window.addEventListener('load', () => {
      const loader = $('#loader');
      setTimeout(() => {
        loader.classList.add('hide');
      }, 800); // Reduced delay for faster loading feel
    });
    
    window.addEventListener("load", () => {
    document.getElementById("loader").classList.add("hide");
  });

    // --- Notification Function ---
    function showNotification(message, type) {
        const notif = $('#notification');
        const iconMap = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-times-circle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        
        notif.innerHTML = `
            <span class="icon">${iconMap[type] || '<i class="fas fa-bell"></i>'}</span>
            <div class="message">${message}</div>
        `;
        notif.className = `notification show ${type}`;
        
        setTimeout(() => {
            notif.classList.remove('show');
        }, 4000);
    }

    // --- AI Assistant Functionality ---
    const aiResponses = {
        'intro': {
            response: 'Halo! Saya AI Assistant Tama, siap membantu Anda menemukan informasi tentang jasa desain grafis di Tama Andrea Studio. Silakan ajukan pertanyaan Anda!',
            quickActions: ['💰 Harga', '⏰ Waktu Pengerjaan', '🛠️ Software', '❓ FAQ Lainnya']
        },
        'harga': {
            response: 'Harga desain dimulai dari Rp 10.000. Ini disesuaikan dengan kompleksitas dan jenis desain. Untuk detail harga logo, poster, atau konten sosmed, bisa saya bantu jelaskan lebih lanjut?',
            quickActions: ['Harga Logo', 'Harga Poster', 'Harga Konten Sosmed']
        },
        'logo': {
            response: 'Untuk logo sederhana, harga mulai dari Rp 15.000. Logo akan dibuat dengan software yang saya kuasai seperti Canva Pro atau ibis Paint, dalam format PNG/JPG berkualitas tinggi. Apakah Anda ingin tahu lebih banyak tentang proses pembuatan logo?',
            quickActions: ['Proses Pembuatan Logo', 'Contoh Logo']
        },
        'proses pembuatan logo': {
            response: 'Proses pembuatan logo biasanya dimulai dari diskusi konsep, sketsa awal, revisi, hingga finalisasi. Kami akan bekerja sama untuk memastikan logo sesuai visi Anda.',
            quickActions: ['Berapa lama prosesnya?', 'Lihat Contoh Logo']
        },
        'contoh logo': {
            response: 'Anda bisa melihat beberapa contoh logo yang pernah saya buat di bagian "Portofolio" di website ini. Klik tombol "Lihat Contoh Desain" di bagian atas halaman.',
            quickActions: ['Lihat Portofolio', 'Harga Logo']
        },
        'poster': {
            response: 'Desain poster dan flyer digital dimulai dari Rp 10.000. Harga tergantung kerumitan dan jumlah revisi. Ada contoh desain poster yang ingin Anda lihat?',
            quickActions: ['Contoh Poster', 'Revisi Poster']
        },
        'konten sosmed': {
            response: 'Untuk konten media sosial, harga mulai dari Rp 10.000 per desain. Tersedia juga paket bulanan untuk kebutuhan rutin. Apa jenis konten yang Anda butuhkan?',
            quickActions: ['Paket Sosmed', 'Contoh Konten Sosmed']
        },
        'waktu': {
            response: 'Estimasi pengerjaan: 1-3 hari kerja untuk desain sederhana, 3-7 hari untuk desain kompleks. Waktu bisa lebih cepat jika urgent dengan biaya tambahan. Apakah Anda punya deadline tertentu?',
            quickActions: ['Desain Urgent', 'Layanan Cepat']
        },
        'revisi': {
            response: 'Ya, saya menyediakan revisi hingga desain sesuai keinginan Anda. Untuk paket basic: 2x revisi, paket premium: unlimited revisi. Berapa kali revisi yang Anda butuhkan?',
            quickActions: ['Paket Basic', 'Paket Premium']
        },
        'paket basic': {
            response: 'Paket Basic biasanya mencakup 2 kali revisi. Ini cocok untuk Anda yang sudah memiliki konsep jelas dan hanya butuh sedikit penyesuaian.',
            quickActions: ['Apa itu Paket Premium?', 'Harga Paket Basic']
        },
        'paket premium': {
            response: 'Paket Premium menawarkan revisi tanpa batas, memastikan Anda mendapatkan desain yang benar-benar sempurna. Cocok untuk proyek yang membutuhkan eksplorasi lebih lanjut.',
            quickActions: ['Harga Paket Premium', 'Perbedaan dengan Basic']
        },
        'format': {
            response: 'File yang akan Anda terima: JPG (high resolution), PNG (transparent background jika diperlukan), atau PDF (print ready). File mentah tersedia dengan biaya tambahan. Format apa yang Anda inginkan?',
            quickActions: ['File Mentah', 'Format JPG/PNG']
        },
        'file mentah': {
            response: 'File mentah (.AI atau .PSD) dapat disediakan dengan biaya tambahan. Ini berguna jika Anda ingin melakukan editing sendiri di kemudian hari atau menyerahkannya ke desainer lain.',
            quickActions: ['Berapa biaya file mentah?', 'Apa itu .AI/.PSD?']
        },
        'pembayaran': {
            response: 'Kami menerima pembayaran melalui DANA, GoPay, QRIS, Transfer Bank, dan Tunai (sesuai kesepakatan). Metode mana yang ingin Anda ketahui detailnya?',
            quickActions: ['Detail QRIS', 'Rekening Bank', 'Pembayaran Tunai']
        },
        'detail qris': {
            response: 'Untuk pembayaran via QRIS, Anda bisa memindai kode QR yang tersedia di bagian "Metode Pembayaran" di website ini. Pastikan aplikasi pembayaran Anda mendukung QRIS.',
            quickActions: ['Lihat QRIS Code', 'Metode Pembayaran Lain']
        },
        'rekening bank': {
            response: 'Informasi rekening bank akan segera tersedia. Saat ini, Anda bisa menggunakan GoPay, DANA, atau QRIS. Mohon maaf atas ketidaknyamanannya.',
            quickActions: ['GoPay/DANA', 'Kapan tersedia?']
        },
        'pembayaran tunai': {
            response: 'Pembayaran tunai dapat dilakukan untuk transaksi tatap muka atau sesuai kesepakatan. Mohon hubungi kami terlebih dahulu untuk mengatur jadwal.',
            quickActions: ['Hubungi via WA', 'Lokasi Pertemuan']
        },
        'kontak': {
            response: 'Anda bisa menghubungi saya via WhatsApp di +62 812-7485-2534 atau mengisi form di website ini. Ada yang bisa saya bantu lebih lanjut?',
            quickActions: ['Chat WhatsApp', 'Isi Formulir']
        },
        'software': {
            response: 'Saat ini saya sudah menguasai Canva Pro dan ibis Paint dengan baik. Sedang dalam proses pembelajaran Adobe Illustrator, Photoshop, dan Figma untuk memberikan hasil yang lebih profesional. Software mana yang ingin Anda tanyakan?',
            quickActions: ['Canva Pro', 'Adobe Illustrator']
        },
        'canva pro': {
            response: 'Canva Pro adalah salah satu software utama yang saya gunakan. Ini memungkinkan saya membuat desain cepat dengan kualitas tinggi dan akses ke berbagai elemen premium.',
            quickActions: ['Kelebihan Canva Pro', 'Software Lain']
        },
        'adobe illustrator': {
            response: 'Saya sedang dalam proses belajar Adobe Illustrator untuk desain vektor yang lebih kompleks dan skalabel. Ini akan memungkinkan saya menawarkan layanan logo dan ilustrasi yang lebih canggih di masa depan.',
            quickActions: ['Kapan bisa digunakan?', 'Apa itu vektor?']
        },
        'pengalaman': {
            response: 'Saya masih dalam tahap awal pengembangan jasa desain ini, tapi saya sangat berdedikasi untuk memberikan hasil terbaik. Harga yang saya tawarkan sangat terjangkau karena ini juga merupakan bagian dari proses pembelajaran saya. Ada pertanyaan lain tentang pengalaman saya?',
            quickActions: ['Portofolio Saya', 'Kualitas Desain']
        },
        'kualitas': {
            response: 'Meskipun masih pemula, saya selalu berusaha memberikan hasil terbaik dengan software yang sudah saya kuasai. Setiap proyek saya kerjakan dengan detail dan sesuai kebutuhan klien. Anda bisa melihat contohnya di bagian portofolio.',
            quickActions: ['Lihat Portofolio']
        },
        'portofolio saya': {
            response: 'Tentu, Anda bisa melihat contoh-contoh desain saya di bagian "Portofolio" di website ini. Saya terus memperbarui koleksi saya.',
            quickActions: ['Lihat Portofolio', 'Jenis Desain']
        },
        'faq lainnya': {
            response: 'Silakan lihat bagian "Tanya Jawab" di atas untuk pertanyaan umum lainnya, atau tanyakan langsung di sini.',
            quickActions: ['Berapa lama pengerjaan?', 'Apakah bisa revisi?']
        },
        'default': {
            response: 'Maaf, saya belum memahami pertanyaan Anda. Silakan coba tanyakan tentang: harga, waktu pengerjaan, revisi, format file, pembayaran, software yang saya gunakan, atau pengalaman saya.',
            quickActions: ['💰 Harga', '⏰ Waktu', '🛠️ Software', '📁 Format']
        }
    };

    let chatHistory = [];
    let isTyping = false;

    function getAIResponse(input) {
        const lowerInput = input.toLowerCase();
        
        // Specific questions first
        if (lowerInput.includes('harga logo')) return aiResponses.logo;
        if (lowerInput.includes('harga poster') || lowerInput.includes('flyer')) return aiResponses.poster;
        if (lowerInput.includes('harga konten sosmed') || lowerInput.includes('media sosial')) return aiResponses['konten sosmed'];
        if (lowerInput.includes('proses pembuatan logo')) return aiResponses['proses pembuatan logo'];
        if (lowerInput.includes('contoh logo')) return aiResponses['contoh logo'];
        if (lowerInput.includes('paket basic')) return aiResponses['paket basic'];
        if (lowerInput.includes('paket premium')) return aiResponses['paket premium'];
        if (lowerInput.includes('file mentah')) return aiResponses['file mentah'];
        if (lowerInput.includes('detail qris')) return aiResponses['detail qris'];
        if (lowerInput.includes('rekening bank')) return aiResponses['rekening bank'];
        if (lowerInput.includes('pembayaran tunai')) return aiResponses['pembayaran tunai'];
        if (lowerInput.includes('canva pro')) return aiResponses['canva pro'];
        if (lowerInput.includes('adobe illustrator')) return aiResponses['adobe illustrator'];
        if (lowerInput.includes('portofolio saya') || lowerInput.includes('lihat portofolio')) return aiResponses['portofolio saya'];
        if (lowerInput.includes('kualitas desain')) return aiResponses['kualitas'];
        if (lowerInput.includes('faq lainnya') || lowerInput.includes('pertanyaan lain')) return aiResponses['faq lainnya'];

        // General keywords
        if (lowerInput.includes('harga') || lowerInput.includes('biaya') || lowerInput.includes('tarif')) return aiResponses.harga;
        if (lowerInput.includes('waktu pengerjaan') || lowerInput.includes('deadline') || lowerInput.includes('berapa lama')) return aiResponses.waktu;
        if (lowerInput.includes('revisi') || lowerInput.includes('perbaikan')) return aiResponses.revisi;
        if (lowerInput.includes('format file') || lowerInput.includes('file apa') || lowerInput.includes('ekstensi')) return aiResponses.format;
        if (lowerInput.includes('pembayaran') || lowerInput.includes('bayar') || lowerInput.includes('dana') || lowerInput.includes('gopay') || lowerInput.includes('qris') || lowerInput.includes('transfer bank') || lowerInput.includes('tunai')) return aiResponses.pembayaran;
        if (lowerInput.includes('kontak') || lowerInput.includes('hubungi') || lowerInput.includes('telepon')) return aiResponses.kontak;
        if (lowerInput.includes('software') || lowerInput.includes('aplikasi') || lowerInput.includes('tools')) return aiResponses.software;
        if (lowerInput.includes('pengalaman') || lowerInput.includes('background')) return aiResponses.pengalaman;
        if (lowerInput.includes('kualitas') || lowerInput.includes('mutu')) return aiResponses.kualitas;

        return aiResponses.default;
    }

    function addChatMessage(message, isUser = false) {
        const chatMessages = $('#chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isUser ? 'user' : 'ai'}`;
        messageDiv.textContent = message;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to bottom
        
        if (!chatMessages.style.display || chatMessages.style.display === 'none') {
            chatMessages.style.display = 'block';
        }
        chatHistory.push({ message: message, isUser: isUser });
    }

    function displayQuickActions(actions) {
        const quickQuestionsContainer = $('.quick-questions');
        quickQuestionsContainer.innerHTML = ''; // Clear previous quick actions
        actions.forEach(actionText => {
            const btn = document.createElement('button');
            btn.className = 'quick-btn';
            btn.textContent = actionText;
            btn.dataset.question = actionText;
            btn.addEventListener('click', () => {
                $('#chatInput').value = actionText;
                sendMessage(actionText);
            });
            quickQuestionsContainer.appendChild(btn);
        });
    }

    function showTypingIndicator() {
        const typingIndicator = $('#typingIndicator');
        typingIndicator.style.display = 'block';
        const chatMessages = $('#chatMessages');
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to bottom
    }

    function hideTypingIndicator() {
        const typingIndicator = $('#typingIndicator');
        typingIndicator.style.display = 'none';
    }

    function sendMessage(message) {
        if (isTyping || !message.trim()) return;
        
        isTyping = true;
        $('#sendChat').disabled = true;
        
        addChatMessage(message, true);
        showTypingIndicator();
        
        setTimeout(() => {
            hideTypingIndicator();
            const { response, quickActions } = getAIResponse(message);
            addChatMessage(response, false);
            if (quickActions && quickActions.length > 0) {
                displayQuickActions(quickActions);
            } else {
                displayQuickActions(aiResponses.default.quickActions);
            }
            isTyping = false;
            $('#sendChat').disabled = false;
        }, 1500 + Math.random() * 1000); // Simulate AI thinking time
    }

    // Initial AI Assistant greeting
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            addChatMessage(aiResponses.intro.response, false);
            displayQuickActions(aiResponses.intro.quickActions);
        }, 1000); // Delay for loader
    });


    $('#sendChat').addEventListener('click', () => {
        const input = $('#chatInput');
        const userMessage = input.value.trim();
        input.value = '';
        sendMessage(userMessage);
    });

    $('#chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !isTyping) {
            const userMessage = e.target.value.trim();
            e.target.value = '';
            sendMessage(userMessage);
        }
    });

    // --- General UI Interactions ---
    $('#year').textContent = new Date().getFullYear();

    const io = new IntersectionObserver((entries) => {
     entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('show');
      });
    }, { threshold: 0.12 });
    $$('.reveal').forEach(el => io.observe(el));

    // Modal Lightbox (for portfolio and credibility items)
    const modal = $('#modal'), modalContent = $('#modal-content');
    const modalCloseBtn = $('.modal-close-btn', modal);

    function openModal(contentHtml) {
        modalContent.innerHTML = contentHtml;
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        modalCloseBtn.focus(); // Focus close button for accessibility
    }

    function closeModal() {
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        modalContent.innerHTML = ''; // Clear content
    }

    $$('.item, .credibility-card').forEach(item => {
      item.addEventListener('click', () => {
        const imgSrc = item.dataset.src || (item.querySelector('img') ? item.querySelector('img').src : null);
        const videoSrc = item.dataset.video;
        const altText = item.querySelector('img') ? item.querySelector('img').alt : 'Gambar';

        let contentHtml = '';
        if (videoSrc && videoSrc !== '.') {
            contentHtml = `<iframe src="${videoSrc}?autoplay=1" title="Tutorial Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        } else if (imgSrc && imgSrc.endsWith('.pdf')) {
            contentHtml = `<iframe src="${imgSrc}" title="Document" width="100%" height="100%"></iframe>`;
        } else if (imgSrc) {
            contentHtml = `<img src="${imgSrc}" alt="${altText}">`;
        }
        
        openModal(contentHtml);
      });

      item.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') item.click();
      });
    });

    modalCloseBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'modal') { // Only close if clicking on the overlay itself
        closeModal();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('show')) {
        closeModal();
      }
    });

    // Info Modal functionality
    const infoModal = $('#info-modal');
    const closeInfoModalBtn = $('.modal-close-btn', infoModal); // Use the general close button class
    const mobileInfoButton = $('#mobileInfoButton');

    function openInfoModal() {
        infoModal.classList.add('show');
        infoModal.setAttribute('aria-hidden', 'false');
        closeInfoModalBtn.focus();
    }

    function closeInfoModal() {
        infoModal.classList.remove('show');
        infoModal.setAttribute('aria-hidden', 'true');
    }

    if (mobileInfoButton) {
        mobileInfoButton.addEventListener('click', (e) => {
            e.preventDefault();
            openInfoModal();
            closeMobileMenu(); // Close mobile menu if open
        });
    }
    // Desktop Info button
    $$('nav.primary-nav a[href="#info-modal"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openInfoModal();
        });
    });

    closeInfoModalBtn.addEventListener('click', closeInfoModal);
    $('#closeInfoModal').addEventListener('click', closeInfoModal); // Specific button inside custom content

    infoModal.addEventListener('click', (e) => {
      if (e.target.id === 'info-modal') {
        closeInfoModal();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && infoModal.classList.contains('show')) {
        closeInfoModal();
      }
    });
    


    // Portfolio Filter
    const filterButtons = $$('.filter-btn');
    const portfolioItems = $$('.item');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            
            portfolioItems.forEach(item => {
                if (filter === 'all' || item.dataset.category === filter) {
                    item.classList.remove('hide');
                } else {
                    item.classList.add('hide');
                }
            });
        });
    });

    // Bad Words Filter for Form
    const filterList = [
        /\b(negatif|buruk|jelek|sampah|penipu|hoax|bohong|curang|tidak profesional|amatir|payah|mengecewakan|parah|cacat|gagal|rusak|kotor|jorok|sial|brengsek|bajingan|bangsat|anjing|babi|monyet|tolol|bodoh|goblok|idiot|kampret|keparat|setan|iblis|neraka|jahanam|fuck|shit|asshole|bitch|damn|cunt|dick|pussy|faggot|nigger)\b/gi,
        /\b(fuck|shit|asshole|bitch|damn|cunt|dick|pussy|faggot|nigger)\b/gi // English profanity
    ];

    function containsBadWords(text) {
        return filterList.some(regex => regex.test(text));
    }

    // Anti-Spam Bot: Captcha & Honeypot
    let captchaAnswer;
    const formStartTime = Date.now();

    function generateCaptcha() {
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        captchaAnswer = num1 + num2;
        $('#captcha-question').textContent = `${num1} + ${num2}`;
        $('#captcha').value = '';
        $('#captcha-error').style.display = 'none';
    }

    generateCaptcha();
    
    // Formspree submission with enhanced notifications and anti-spam
    const form = $('#orderForm');
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const descInput = $('#desc');
      const descValue = descInput.value;
      
      if (containsBadWords(descValue)) {
        showNotification('Maaf, pesan Anda mengandung kata-kata yang tidak pantas. Mohon gunakan bahasa yang sopan.', 'error');
        return;
      }

      const honeypotField = $('#address');
      if (honeypotField.value) {
        showNotification('Terdeteksi aktivitas mencurigakan. Pesan tidak terkirim.', 'error');
        return;
      }

      const formSubmitTime = Date.now();
      const timeTaken = formSubmitTime - formStartTime;
      if (timeTaken < 2000) { // Minimum 2 seconds to submit
        showNotification('Pesan terkirim terlalu cepat. Terdeteksi aktivitas bot.', 'error');
        return;
      }

      const userAnswer = parseInt($('#captcha').value, 10);
      if (isNaN(userAnswer) || userAnswer !== captchaAnswer) { // Check for NaN as well
        $('#captcha-error').textContent = 'Jawaban Captcha salah. Silakan coba lagi.';
        $('#captcha-error').style.display = 'block';
        showNotification('Jawaban Captcha salah. Silakan coba lagi.', 'error');
        generateCaptcha();
        return;
      }

      const status = e.target.querySelector("#sendBtn");
      status.disabled = true;
      status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...'; // Add spinner icon
      
      const data = new FormData(e.target);
      try {
        const response = await fetch(e.target.action, {
          method: form.method,
          body: data,
          headers: {
            'Accept': 'application/json'
          }
        });
        if (response.ok) {
          showNotification('🎉 Pesan berhasil terkirim! Saya akan segera merespons.', 'success');
          form.reset();
          generateCaptcha();
        } else {
          const errorData = await response.json();
          showNotification(`❌ Terjadi kesalahan: ${errorData.error || 'Silakan coba lagi.'}`, 'error');
        }
      } catch (error) {
        showNotification('❌ Koneksi bermasalah. Periksa internet Anda dan coba lagi.', 'error');
      } finally {
        status.disabled = false;
        status.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim via Email';
      }
    });

    // Button actions
    const ctaHero = $('#ctaHero');
    const seePortfolio = $('#seePortfolio');
    const orderNow = $('#orderNow');
    const quickChat = $('#quickChat');
    const floatWA = $('#floatWA');

    ctaHero.addEventListener('click', () => {
    });

    seePortfolio.addEventListener('click', () => {
      document.getElementById('portfolio').scrollIntoView({ behavior: 'smooth' });
    });

    orderNow.addEventListener('click', () => {
      document.getElementById('kontak').scrollIntoView({ behavior: 'smooth' });
    });

    quickChat.addEventListener('click', () => {
      window.open(`https://wa.me/${WA_NUMBER}`, '_blank');
    });

    floatWA.addEventListener('click', () => {
      window.open(`https://wa.me/${WA_NUMBER}`, '_blank');
    });

    // Copy to clipboard functionality
    $$('.copy-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const targetId = e.currentTarget.dataset.target;
            const textToCopy = document.getElementById(targetId).textContent;
            try {
                await navigator.clipboard.writeText(textToCopy);
                showNotification('Teks berhasil disalin!', 'success');
            } catch (err) {
                showNotification('Gagal menyalin teks.', 'error');
                console.error('Failed to copy: ', err);
            }
        });
    });

    // --- Mobile Navigation Logic ---
    const mobileToggle = document.querySelector('.mobile-nav-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileOverlay = document.querySelector('.mobile-menu-overlay');
    const mobileClose = document.querySelector('.mobile-menu .close-btn');

    function openMobileMenu() {
      mobileMenu.classList.add('show');
      mobileOverlay.classList.add('show');
      mobileMenu.setAttribute('aria-hidden', 'false');
      mobileOverlay.setAttribute('aria-hidden', 'false');
      mobileToggle.setAttribute('aria-expanded', 'true');
      mobileClose.focus(); // Focus on close button for accessibility
      trapFocus(mobileMenu); // Activate focus trap
    }

    function closeMobileMenu() {
      mobileMenu.classList.remove('show');
      mobileOverlay.classList.remove('show');
      mobileMenu.setAttribute('aria-hidden', 'true');
      mobileOverlay.setAttribute('aria-hidden', 'true');
      mobileToggle.setAttribute('aria-expanded', 'false');
      mobileToggle.focus(); // Return focus to hamburger button
      releaseFocusTrap(); // Deactivate focus trap
    }

    mobileToggle.addEventListener('click', () => {
      if (mobileMenu.classList.contains('show')) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });

    mobileClose.addEventListener('click', closeMobileMenu);
    mobileOverlay.addEventListener('click', closeMobileMenu);

    // Close menu when clicking any link inside mobile menu
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMobileMenu);
    });

    // Close menu on ESC key
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('show')) {
        closeMobileMenu();
      }
    });

    // --- Accessibility: Focus Trap for Mobile Menu ---
    let focusableElements = [];
    let firstFocusableEl = null;
    let lastFocusableEl = null;
    let focusTrapActive = false;

    function trapFocus(element) {
      focusableElements = Array.from(element.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (focusableElements.length === 0) return;
      firstFocusableEl = focusableElements[0];
      lastFocusableEl = focusableElements[focusableElements.length - 1];
      focusTrapActive = true;
      element.addEventListener('keydown', handleTrap);
    }

    function releaseFocusTrap() {
      if (!focusTrapActive) return;
      mobileMenu.removeEventListener('keydown', handleTrap);
      focusTrapActive = false;
    }

    function handleTrap(e) {
      if (e.key !== 'Tab') return;
      if (focusableElements.length === 0) return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusableEl) {
          e.preventDefault();
          lastFocusableEl.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusableEl) {
          e.preventDefault();
          firstFocusableEl.focus();
        }
      }
    }

document.addEventListener("DOMContentLoaded", () => {
  const track = document.getElementById("partnerships-track");
  if (!track) return;

  // 1. Gandakan konten secara aman menggunakan DocumentFragment
  const clone = track.innerHTML;
  track.insertAdjacentHTML('beforeend', clone);

  // 2. Gunakan CSS class untuk menjalankan animasi
  // Ini jauh lebih ringan daripada requestAnimationFrame setiap milidetik
  track.classList.add("animating");

  // Opsi: Jika ingin mengatur kecepatan via JS
  // track.style.animationDuration = "20s"; 
});
    
    /* ================= Portfolio Slider JS (robust & responsive) ================= */
document.addEventListener('DOMContentLoaded', function () {
  const track = document.querySelector('.portfolio-track');
  const prevBtn = document.querySelector('.portfolio-prev');
  const nextBtn = document.querySelector('.portfolio-next');

  if (!track || !prevBtn || !nextBtn) {
    // Jika elemen tidak ditemukan, hentikan agar tidak error
    console.warn('Portfolio slider: elemen tidak lengkap, skrip dihentikan.');
    return;
  }

  const slides = Array.from(track.children);
  const MOBILE_BP = 768; // breakpoint mobile <= 768
  let slidesPerView = window.innerWidth <= MOBILE_BP ? 1 : 3;
  let currentIndex = 0;
  let isDragging = false;
  let startX = 0;
  let deltaX = 0;
  let resizeTimer = null;

  // Hitung dan terapkan transform berdasarkan currentIndex & slidesPerView
  function updateTrack() {
    slidesPerView = window.innerWidth <= MOBILE_BP ? 1 : 3;
    // Untuk desktop (multi-view) kita *tidak* loop; clamp index
    if (slidesPerView > 1) {
      const maxIndex = Math.max(0, slides.length - slidesPerView);
      currentIndex = Math.min(Math.max(currentIndex, 0), maxIndex);
    } else {
      // mobile: currentIndex boleh apa saja karena kita loop (handled in next/prev)
      currentIndex = ((currentIndex % slides.length) + slides.length) % slides.length;
    }

    const offsetPercent = currentIndex * (100 / slidesPerView);
    track.style.transition = 'transform 0.55s cubic-bezier(.22,.9,.35,1)';
    track.style.transform = `translateX(-${offsetPercent}%)`;
    updateButtons();
  }

  function updateButtons() {
    // Jika multi-view (desktop), disable prev/next bila mencapai batas.
    if (slidesPerView > 1) {
      prevBtn.disabled = currentIndex === 0;
      nextBtn.disabled = currentIndex >= (slides.length - slidesPerView);
      prevBtn.classList.toggle('disabled', prevBtn.disabled);
      nextBtn.classList.toggle('disabled', nextBtn.disabled);
    } else {
      // mobile: selalu aktif (looping)
      prevBtn.disabled = false;
      nextBtn.disabled = false;
      prevBtn.classList.remove('disabled');
      nextBtn.classList.remove('disabled');
    }
  }

  function goNext() {
    if (slidesPerView === 1) {
      // mobile -> looping
      currentIndex = (currentIndex + 1) % slides.length;
    } else {
      // desktop -> geser 1 per klik tapi tidak melewati batas
      if (currentIndex < slides.length - slidesPerView) currentIndex++;
    }
    updateTrack();
  }

  function goPrev() {
    if (slidesPerView === 1) {
      // mobile -> looping
      currentIndex = (currentIndex - 1 + slides.length) % slides.length;
    } else {
      // desktop -> geser 1 per klik tapi tidak lewat 0
      if (currentIndex > 0) currentIndex--;
    }
    updateTrack();
  }

  // tombol click
  nextBtn.addEventListener('click', goNext);
  prevBtn.addEventListener('click', goPrev);

  // keyboard (arrow keys)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') goNext();
    if (e.key === 'ArrowLeft') goPrev();
  });

  // resize (debounce)
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // adjust currentIndex agar tetap valid
      const oldSlidesPerView = slidesPerView;
      slidesPerView = window.innerWidth <= MOBILE_BP ? 1 : 3;
      if (oldSlidesPerView !== slidesPerView) {
        // jika berubah mode, clamp index agar tidak kosong pada mode desktop
        if (slidesPerView > 1) {
          currentIndex = Math.min(currentIndex, Math.max(0, slides.length - slidesPerView));
        } else {
          currentIndex = currentIndex % slides.length;
        }
      }
      updateTrack();
    }, 120);
  });

  // Touch / swipe support (mobile)
  track.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) return;
    isDragging = true;
    startX = e.touches[0].clientX;
    deltaX = 0;
    track.style.transition = ''; // disable transition while dragging
  }, { passive: true });

  track.addEventListener('touchmove', (e) => {
    if (!isDragging || e.touches.length > 1) return;
    const x = e.touches[0].clientX;
    deltaX = x - startX;
    const movePercent = (deltaX / track.clientWidth) * (100 / slidesPerView);
    const baseOffset = currentIndex * (100 / slidesPerView);
    track.style.transform = `translateX(-${baseOffset - movePercent}%)`;
  }, { passive: true });

  track.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    // sensitivity threshold
    const threshold = 50; // px
    if (Math.abs(deltaX) > threshold) {
      if (deltaX < 0) goNext();
      else goPrev();
    } else {
      updateTrack(); // snap back
    }
    deltaX = 0;
  });

  // Mouse drag (optional for desktop)
  let isMouseDown = false;
  track.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    startX = e.clientX;
    track.style.transition = '';
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!isMouseDown) return;
    deltaX = e.clientX - startX;
    const movePercent = (deltaX / track.clientWidth) * (100 / slidesPerView);
    const baseOffset = currentIndex * (100 / slidesPerView);
    track.style.transform = `translateX(-${baseOffset - movePercent}%)`;
  });
  window.addEventListener('mouseup', () => {
    if (!isMouseDown) return;
    isMouseDown = false;
    if (Math.abs(deltaX) > 80) { // mouse drag needs bigger threshold
      if (deltaX < 0) goNext();
      else goPrev();
    } else {
      updateTrack();
    }
    deltaX = 0;
  });

  // initial update
  updateTrack();

  // Make sure images are loaded before first position (improves accuracy)
  const imgs = track.querySelectorAll('img');
  let loadedCount = 0;
  imgs.forEach(img => {
    if (img.complete) {
      loadedCount++;
    } else {
      img.addEventListener('load', () => {
        loadedCount++;
        if (loadedCount === imgs.length) updateTrack();
      });
      img.addEventListener('error', () => {
        loadedCount++;
        if (loadedCount === imgs.length) updateTrack();
      });
    }
  });
});
/* ================= end portfolio slider ================= */
  
/**
 * Logika Pengalih Tema (Dark/Light Mode)
 */
function setupThemeToggle() {
  const themeToggle = document.getElementById("theme-toggle");
  const root = document.documentElement;
  const themeKey = "theme";
  
  // 1. Fungsi untuk menerapkan tema
  const applyTheme = (theme) => {
    if (theme === 'light') {
      root.classList.add('light');
      localStorage.setItem(themeKey, 'light');
    } else {
      root.classList.remove('light');
      localStorage.setItem(themeKey, 'dark');
    }
  };

  // 2. Tentukan tema awal
  const initialTheme = localStorage.getItem(themeKey);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (initialTheme) {
    // Jika ada di localStorage, gunakan itu
    applyTheme(initialTheme);
  } else if (prefersDark) {
    // Jika tidak ada di localStorage, gunakan preferensi sistem (default ke dark)
    applyTheme('dark');
  } else {
    // Default ke light jika tidak ada preferensi dan sistem tidak dark
    applyTheme('light'); 
  }

  // 3. Listener untuk tombol toggle
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      // Toggle tema yang saat ini aktif
      const currentTheme = root.classList.contains('light') ? 'light' : 'dark';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      applyTheme(newTheme);
    });
  }
}

/**
 * Logika Efek Scroll Header
 */
function setupHeaderScrollEffect() {
  const headerNav = document.querySelector('header.nav');
  if (!headerNav) return; // Keluar jika elemen tidak ditemukan

  // Gunakan 'scroll' event listener pada elemen, bukan window, karena Anda memeriksa `headerNav.scrollLeft`
  headerNav.addEventListener('scroll', () => {
    // Memeriksa apakah scroll horisontal (scrollLeft) lebih dari ambang batas
    if (headerNav.scrollLeft > 50) {
      headerNav.classList.add('scrolled');
    } else {
      headerNav.classList.remove('scrolled');
    }
  });
}

// Jalankan semua fungsi setelah DOM dimuat
document.addEventListener("DOMContentLoaded", () => {
  setupThemeToggle();
  setupHeaderScrollEffect();
});

document.addEventListener('DOMContentLoaded', () => {

  const nav = document.getElementById('primary-navigation');
  if (!nav) return;

  const SCROLL_STEP = 140; // kamu bisa ubah lebih cepat/lebih lambat

  // Cek apakah layar adalah desktop
  function isDesktop() {
    return window.innerWidth >= 900;
  }

  // Keyboard saat NAV sedang fokus
  nav.addEventListener('keydown', (e) => {
    if (!isDesktop()) return;

    const key = e.key.toLowerCase();

    if (key === 'arrowright' || key === 'd') {
      e.preventDefault();
      nav.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
    }

    if (key === 'arrowleft' || key === 'a') {
      e.preventDefault();
      nav.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' });
    }
  });

  // Bonus: jika mouse berada di atas nav, user bisa menekan keyboard tanpa harus tab fokus
  let hover = false;

  nav.addEventListener('mouseenter', () => hover = true);
  nav.addEventListener('mouseleave', () => hover = false);

  document.addEventListener('keydown', (e) => {
    if (!hover || !isDesktop()) return;

    const key = e.key.toLowerCase();

    if (key === 'arrowright' || key === 'd') {
      e.preventDefault();
      nav.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
    }

    if (key === 'arrowleft' || key === 'a') {
      e.preventDefault();
      nav.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' });
    }
  });

});