import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { api, PaymentCheckout, PaymentCheckoutRequest, PaymentConfirmResult } from '@/lib/api';

interface PaymentModalProps {
  visible: boolean;
  checkoutRequest: PaymentCheckoutRequest | null;
  onClose: () => void;
  onSuccess: (result: PaymentConfirmResult) => void;
}

export function PaymentModal({
  visible,
  checkoutRequest,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [checkout, setCheckout] = useState<PaymentCheckout | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [stripeMode, setStripeMode] = useState<string>('demo');
  const [StripeForm, setStripeForm] = useState<React.ComponentType<{
    clientSecret: string;
    amount: number;
    onSuccess: () => void;
    onError: (msg: string) => void;
    paying: boolean;
    setPaying: (v: boolean) => void;
  }> | null>(null);

  useEffect(() => {
    if (!visible || !checkoutRequest) {
      setCheckout(null);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    api.getPaymentConfig().then((c) => setStripeMode(c.stripe_mode));
    api
      .createPaymentCheckout(checkoutRequest)
      .then(setCheckout)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [visible, checkoutRequest]);

  useEffect(() => {
    if (!checkout?.client_secret || checkout.demo_mode || Platform.OS !== 'web') return;

    let cancelled = false;
    (async () => {
      try {
        const config = await api.getPaymentConfig();
        if (!config.publishable_key) return;

        const [{ loadStripe }, { Elements, PaymentElement, useStripe, useElements }] =
          await Promise.all([
            import('@stripe/stripe-js'),
            import('@stripe/react-stripe-js'),
          ]);

        const stripe = await loadStripe(config.publishable_key);
        if (!stripe || cancelled) return;

        function StripePaymentForm({
          clientSecret,
          amount,
          onSuccess,
          onError,
          paying,
          setPaying,
        }: {
          clientSecret: string;
          amount: number;
          onSuccess: () => void;
          onError: (msg: string) => void;
          paying: boolean;
          setPaying: (v: boolean) => void;
        }) {
          const stripe = useStripe();
          const elements = useElements();

          const handlePay = async () => {
            if (!stripe || !elements) return;
            setPaying(true);
            const { error: submitError } = await elements.submit();
            if (submitError) {
              onError(submitError.message || 'Payment failed');
              setPaying(false);
              return;
            }
            const { error: confirmError } = await stripe.confirmPayment({
              elements,
              clientSecret,
              confirmParams: { return_url: window.location.href },
              redirect: 'if_required',
            });
            if (confirmError) {
              onError(confirmError.message || 'Payment failed');
              setPaying(false);
              return;
            }
            onSuccess();
            setPaying(false);
          };

          return (
            <View>
              <View style={styles.stripeElement}>
                <PaymentElement />
              </View>
              <TouchableOpacity
                style={[styles.payBtn, paying && styles.payBtnDisabled]}
                onPress={handlePay}
                disabled={paying}
              >
                {paying ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.payBtnText}>Pay ${amount.toFixed(2)}</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        }

        if (!cancelled) {
          setStripeForm(() =>
            function Wrapped(props: {
              clientSecret: string;
              amount: number;
              onSuccess: () => void;
              onError: (msg: string) => void;
              paying: boolean;
              setPaying: (v: boolean) => void;
            }) {
              return (
                <Elements stripe={stripe} options={{ clientSecret: props.clientSecret }}>
                  <StripePaymentForm {...props} />
                </Elements>
              );
            }
          );
        }
      } catch {
        setStripeForm(null);
      }
    })();

    return () => { cancelled = true; };
  }, [checkout?.client_secret, checkout?.demo_mode]);

  const confirmPayment = async () => {
    if (!checkout) return;
    setPaying(true);
    setError('');
    try {
      const result = await api.confirmPayment(checkout.payment_id);
      onSuccess(result);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPaying(false);
    }
  };

  const label =
    checkout?.payment_type === 'provider_lead' ? 'Contact this pro' : 'Purchase job lead';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{label}</Text>
          {checkout ? (
            <>
              <Text style={styles.subtitle}>
                {checkout.title} · ${checkout.amount}
              </Text>
              <Text style={styles.hint}>
                {checkout.payment_type === 'provider_lead'
                  ? 'Pay once to unlock this provider\'s phone number.'
                  : 'Pay once to unlock the customer\'s contact info.'}
              </Text>
            </>
          ) : null}

          {stripeMode === 'live' && (
            <View style={styles.liveBanner}>
              <Text style={styles.liveText}>🔴 Live payments — real charges apply</Text>
            </View>
          )}

          {loading ? (
            <ActivityIndicator color={Colors.light.primary} style={{ marginVertical: 24 }} />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : checkout?.demo_mode ? (
            <View>
              <View style={styles.demoBanner}>
                <Text style={styles.demoTitle}>Demo payment mode</Text>
                <Text style={styles.demoText}>
                  Add Stripe keys for real cards. Test: 4242 4242 4242 4242
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.payBtn, paying && styles.payBtnDisabled]}
                onPress={confirmPayment}
                disabled={paying}
              >
                {paying ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.payBtnText}>Pay ${checkout.amount.toFixed(2)} (demo)</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : checkout?.client_secret && StripeForm ? (
            <StripeForm
              clientSecret={checkout.client_secret}
              amount={checkout.amount}
              onSuccess={confirmPayment}
              onError={setError}
              paying={paying}
              setPaying={setPaying}
            />
          ) : checkout ? (
            <Text style={styles.error}>Loading payment form…</Text>
          ) : null}

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: Colors.light.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.light.text },
  subtitle: { fontSize: 16, color: Colors.light.primary, fontWeight: '600', marginTop: 4 },
  hint: { fontSize: 14, color: Colors.light.textSecondary, marginTop: 8, marginBottom: 16 },
  liveBanner: {
    backgroundColor: '#FEE2E2', borderRadius: 10, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: '#FECACA',
  },
  liveText: { fontSize: 13, fontWeight: '600', color: '#991B1B' },
  demoBanner: {
    backgroundColor: '#FEF3C7', borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  demoTitle: { fontSize: 15, fontWeight: '700', color: '#92400E' },
  demoText: { fontSize: 13, color: '#78350F', marginTop: 4 },
  stripeElement: { marginBottom: 16, minHeight: 120 },
  payBtn: {
    backgroundColor: Colors.light.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center',
  },
  payBtnDisabled: { opacity: 0.7 },
  payBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  cancelBtn: { alignItems: 'center', marginTop: 16, paddingVertical: 10 },
  cancelText: { color: Colors.light.textSecondary, fontWeight: '600' },
  error: { color: '#B91C1C', fontSize: 14, marginVertical: 12, textAlign: 'center' },
});