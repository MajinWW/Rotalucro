// Envolvemos tudo para garantir que o HTML carregue antes do Script
document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 1. NAVEGAÇÃO DOS BOTÕES (Blindada contra falhas)
    // =========================================================================
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');

    navItems.forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Remove as classes de todos
            navItems.forEach(n => n.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));
            
            // Adiciona classe no botão clicado e na tela correspondente
            this.classList.add('active');
            const targetId = this.getAttribute('data-target');
            const targetView = document.getElementById(targetId);
            
            if (targetView) {
                targetView.classList.add('active');
            }
        });
    });

    // =========================================================================
    // 2. DADOS E SELETORES
    // =========================================================================
    let transacoesGlobais = [];
    let graficoInstancia = null;

    const filtroPeriodo = document.getElementById('filtro-periodo');
    const formGanho = document.getElementById('form-ganho');
    const formGasto = document.getElementById('form-gasto');
    const listaTransacoes = document.getElementById('lista-transacoes');

    const elGanhos = document.getElementById('val-ganhos');
    const elGastos = document.getElementById('val-gastos');
    const elLucro = document.getElementById('val-lucro');

    const formatarMoeda = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // =========================================================================
    // 3. FILTROS
    // =========================================================================
    function filtrarTransacoes(transacoes) {
        const filtro = filtroPeriodo.value;
        const hoje = new Date();
        
        return transacoes.filter(t => {
            const data = new Date(t.data);
            if (filtro === 'hoje') {
                return data.getDate() === hoje.getDate() && data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear();
            }
            if (filtro === 'semana') {
                const primeiroDia = new Date(hoje);
                primeiroDia.setDate(hoje.getDate() - hoje.getDay());
                primeiroDia.setHours(0,0,0,0);
                return data >= primeiroDia;
            }
            return true;
        });
    }

    // =========================================================================
    // 4. ATUALIZA INTERFACE E GRÁFICO
    // =========================================================================
    function atualizarUI() {
        const transacoes = filtrarTransacoes(transacoesGlobais);
        
        let ganhos = 0;
        let gastos = 0;

        // Limpa lista
        listaTransacoes.innerHTML = '';

        if(transacoes.length === 0) {
            listaTransacoes.innerHTML = '<p style="text-align:center; color:#555; margin-top:20px;">Sem registros.</p>';
        }

        // Calcula totais e monta lista
        transacoes.forEach(t => {
            if (t.tipo === 'ganho') ganhos += t.valor;
            if (t.tipo === 'gasto') gastos += t.valor;

            const li = document.createElement('li');
            li.className = `transacao ${t.tipo}`;
            const info = t.tipo === 'ganho' ? 'CORRIDA' : t.categoria;
            const dataFmt = new Date(t.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
            
            li.innerHTML = `
                <div class="t-info">
                    <span class="t-cat">${info}</span>
                    <span class="t-data">${dataFmt}</span>
                </div>
                <span class="t-valor">${formatarMoeda(t.valor)}</span>
            `;
            listaTransacoes.appendChild(li);
        });

        // Atualiza Cards Iniciais
        const lucro = ganhos - gastos;
        elGanhos.innerText = formatarMoeda(ganhos);
        elGastos.innerText = formatarMoeda(gastos);
        elLucro.innerText = formatarMoeda(lucro);

        // Cor do lucro
        if (lucro < 0) {
            elLucro.className = 'valor-lucro neon-red-text';
        } else {
            elLucro.className = 'valor-lucro neon-text';
        }

        // Atualiza Gráfico (com proteção de falha na internet)
        try {
            if (typeof Chart !== 'undefined') {
                const ctx = document.getElementById('meuGrafico').getContext('2d');
                const valG = ganhos === 0 && gastos === 0 ? 0.1 : ganhos;
                const valD = ganhos === 0 && gastos === 0 ? 0.1 : gastos;
                const cores = ganhos === 0 && gastos === 0 ? ['#222', '#222'] : ['#00ff66', '#ff0044'];

                if (graficoInstancia) {
                    graficoInstancia.data.datasets[0].data = [valG, valD];
                    graficoInstancia.data.datasets[0].backgroundColor = cores;
                    graficoInstancia.update();
                } else {
                    graficoInstancia = new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: ['Ganhos', 'Gastos'],
                            datasets: [{ data: [valG, valD], backgroundColor: cores, borderWidth: 0 }]
                        },
                        options: {
                            responsive: true, maintainAspectRatio: false, cutout: '80%',
                            plugins: { legend: { display: false } }
                        }
                    });
                }
            }
        } catch (e) {
            console.warn("Erro ao carregar gráfico:", e);
        }
    }

    // =========================================================================
    // 5. REGISTRO DE DADOS
    // =========================================================================
    function registrar(tipo, valorBruto, categoria = '') {
        // Pega o valor e garante que virgulas virem pontos para o cálculo
        const strVal = String(valorBruto).replace(',', '.');
        const valorNum = parseFloat(strVal);

        if (isNaN(valorNum) || valorNum <= 0) return;

        transacoesGlobais.unshift({
            tipo: tipo,
            valor: valorNum,
            categoria: categoria,
            data: new Date().toISOString()
        });

        atualizarUI();

        // Força a voltar para a aba Painel
        document.querySelector('.nav-item[data-target="view-dashboard"]').click();
    }

    formGanho.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('input-ganho');
        registrar('ganho', input.value);
        input.value = '';
    });

    formGasto.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('input-gasto');
        const cat = document.getElementById('categoria-gasto');
        registrar('gasto', input.value, cat.value);
        input.value = '';
        cat.value = '';
    });

    filtroPeriodo.addEventListener('change', atualizarUI);

    // Inicia a tela
    atualizarUI();
});
