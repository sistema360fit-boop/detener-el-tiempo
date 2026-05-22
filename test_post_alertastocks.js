async function run() {
  const response = await fetch('http://localhost:4000/api/alertastocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ingredienteId: 'test-id',
      cantidad_actual: 5,
      cantidad_minima: 10
    })
  });
  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Response:', text.substring(0, 100));
}
run();
