const { createApp } = Vue;

createApp({
    data() {
        return {
            isDark: false,
            activeTab: 'new',
            denominations: [10000, 5000, 2000, 1000, 500],
            counts: { 10000: 0, 5000: 0, 2000: 0, 1000: 0, 500: 0 },
            validatorName: '',
            validationDate: new Date().toISOString().split('T')[0],
            history: []
        };
    },
    computed: {
        grandTotal() {
            return this.denominations.reduce((acc, den) => acc + this.getSubtotal(den), 0);
        },
        isValid() {
            return this.validatorName.trim() !== '' && this.validationDate !== '' && this.grandTotal > 0;
        },
        currentData() {
            return {
                name: this.validatorName,
                date: this.validationDate,
                counts: { ...this.counts },
                total: this.grandTotal,
                timestamp: new Date().toLocaleString('fr-FR')
            };
        }
    },
    methods: {
        toggleTheme() {
            this.isDark = !this.isDark;
            document.documentElement.setAttribute('data-theme', this.isDark ? 'dark' : 'light');
            localStorage.setItem('kota_theme', this.isDark ? 'dark' : 'light');
        },
        getSubtotal(denomination) {
            const qty = parseInt(this.counts[denomination]) || 0;
            return qty * denomination;
        },
        formatNumber(num) {
            if (num === null || num === undefined) return '0';
            // Séparation explicite par un espace standard
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        },
        formatCurrency(num) {
            return this.formatNumber(num) + ' FBU';
        },
        formatDateFR(dateStr) {
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        },
        resetForm() {
            this.counts = { 10000: 0, 5000: 0, 2000: 0, 1000: 0, 500: 0 };
            this.validatorName = '';
            this.validationDate = new Date().toISOString().split('T')[0];
        },
        saveCount() {
            if (!this.isValid) return;

            const record = {
                id: Date.now(),
                ...this.currentData
            };

            this.history.unshift(record);
            this.saveHistory();
            this.resetForm();
            this.activeTab = 'history';
        },
        loadHistoryItem(item) {
            this.validatorName = item.name;
            this.validationDate = item.date;
            this.counts = { ...item.counts };
            this.activeTab = 'new';
        },
        deleteHistoryItem(index) {
            if (confirm("Êtes-vous sûr de vouloir supprimer cet enregistrement ?")) {
                this.history.splice(index, 1);
                this.saveHistory();
            }
        },
        saveHistory() {
            localStorage.setItem('kota_history', JSON.stringify(this.history));
        },
        loadHistory() {
            const saved = localStorage.getItem('kota_history');
            if (saved) {
                try {
                    this.history = JSON.parse(saved);
                } catch (e) {
                    console.error("Erreur lecture historique", e);
                }
            }
        },
        exportPDF(dataObj) {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            const primaryColor = [13, 110, 253]; // Bleu Kota
            const textColor = [33, 37, 41];
            const lightGray = [245, 247, 250];

            // 1. Bandeau d'en-tête stylisé
            doc.setFillColor(...primaryColor);
            doc.rect(0, 0, 210, 35, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.text("KOTA - RAPPORT DE COMPTAGE", 105, 18, { align: "center" });

            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.text("Application de Billetage & Comptage de Caisse", 105, 27, { align: "center" });

            // 2. Section Informations Générales
            doc.setTextColor(...textColor);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.text("INFORMATIONS GÉNÉRALES", 14, 52);

            doc.setLineWidth(0.5);
            doc.setDrawColor(...primaryColor);
            doc.line(14, 55, 75, 55);

            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.text("Validateur / Caissier :", 14, 66);
            doc.setFont("helvetica", "bold");
            doc.text(`${dataObj.name}`, 60, 66);

            doc.setFont("helvetica", "normal");
            doc.text("Date du comptage :", 14, 74);
            doc.setFont("helvetica", "bold");
            doc.text(`${this.formatDateFR(dataObj.date)}`, 60, 74);

            doc.setFont("helvetica", "normal");
            doc.text("Généré le :", 14, 82);
            doc.setFont("helvetica", "italic");
            doc.text(`${dataObj.timestamp || new Date().toLocaleString('fr-FR')}`, 60, 82);

            // 3. Tableau des Coupures
            let y = 98;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.text("DÉTAIL DES COUPURES", 14, y);
            doc.line(14, y + 3, 70, y + 3);

            y += 10;

            // En-tête du Tableau
            doc.setFillColor(230, 235, 245);
            doc.rect(14, y, 182, 9, 'F');
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(...textColor);
            doc.text("Coupure (FBU)", 20, y + 6);
            doc.text("Quantité", 100, y + 6, { align: "center" });
            doc.text("Montant Total", 190, y + 6, { align: "right" });

            y += 9;

            // Lignes du Tableau (Affichage propre sous forme de grille)
            doc.setFont("helvetica", "normal");
            let alternate = false;

            this.denominations.forEach(den => {
                const qty = dataObj.counts[den] || 0;
                const sub = qty * den;

                if (alternate) {
                    doc.setFillColor(...lightGray);
                    doc.rect(14, y, 182, 9, 'F');
                }

                doc.setTextColor(...textColor);
                doc.text(`${this.formatNumber(den)} FBU`, 20, y + 6);
                doc.text(`${this.formatNumber(qty)}`, 100, y + 6, { align: "center" });
                doc.text(`${this.formatCurrency(sub)}`, 190, y + 6, { align: "right" });

                // Ligne fine de séparation de ligne
                doc.setLineWidth(0.1);
                doc.setDrawColor(210, 210, 210);
                doc.line(14, y + 9, 196, y + 9);

                y += 9;
                alternate = !alternate;
            });

            // En-tête Total Général stylisé
            y += 4;
            doc.setFillColor(...primaryColor);
            doc.rect(14, y, 182, 11, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.text("TOTAL GÉNÉRAL", 20, y + 7);
            doc.text(`${this.formatCurrency(dataObj.total)}`, 190, y + 7, { align: "right" });

            // 4. Section Émargements / Signatures
            y += 28;
            doc.setTextColor(...textColor);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Signature du Caissier / Validateur", 14, y);
            doc.text("Signature du Superviseur", 135, y);

            // Lignes pour la signature
            doc.setLineWidth(0.2);
            doc.setDrawColor(160, 160, 160);
            doc.line(14, y + 22, 75, y + 22);
            doc.line(135, y + 22, 195, y + 22);

            // Sauvegarde automatique du fichier
            const fileName = `Kota_Billetage_${dataObj.name.replace(/\s+/g, '_')}_${dataObj.date}.pdf`;
            doc.save(fileName);
        }
    },
    mounted() {
        // Charger le thème
        const savedTheme = localStorage.getItem('kota_theme');
        if (savedTheme === 'dark') {
            this.isDark = true;
            document.documentElement.setAttribute('data-theme', 'dark');
        }

        // Charger l'historique
        this.loadHistory();
    }
}).mount('#app');