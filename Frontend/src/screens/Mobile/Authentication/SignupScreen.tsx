import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import styles from "./styles/SignupScreen";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as DocumentPicker from "expo-document-picker";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as Facebook from "expo-auth-session/providers/facebook";
import {
  AuthHeader,
  authScreenStyles,
  Banner,
  Button,
  Checkbox,
  FormField,
  FullScreenOverlay,
  getAuthErrorMessage,
  MinimalistCalendarIcon,
  RolePill,
  SectionTitle,
  StepBadge,
  athleteSignupSchema,
  coachSignupSchema,
  MAX_DOCUMENT_BYTES,
  requestJson,
  requestMultipart,
  type AthleteSignupValues,
  type AuthRole,
  type AuthStep,
  type BannerTone,
  type CoachSignupValues,
  type StoredUpload
} from "./authShared";

type SignupScreenProps = {
  onGoLogin: () => void;
};

type ChoiceGroupProps = {
  label: string;
  placeholder?: string;
  options: readonly string[];
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

const genderOptions = ["Male", "Female"] as const;
const sportOptions = ["Basketball", "Track and Field", "Swimming"] as const;

const DEFAULT_ATHLETE_VALUES: AthleteSignupValues = {
  role: "athlete",
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  contact_number: "",
  birthdate: "",
  gender: "Male",
  province: "",
  sport_type: "Basketball",
  terms_accepted: false
};

const DEFAULT_COACH_VALUES: CoachSignupValues = {
  role: "coach",
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  contact_number: "",
  certification_license_num: "",
  years_of_experience: 0,
  current_institution: "",
  eligible_documents: null,
  terms_accepted: false
};

function ChoiceGroup({ label, placeholder = "Select an option", options, value, error, onChange }: ChoiceGroupProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (option: string) => {
    onChange(option);
    setOpen(false);
  };

  return (
    <View style={styles.dropdownGroup}>
      <Text style={styles.dropdownLabel}>{label}</Text>
      <Pressable
        onPress={() => setOpen((prev) => !prev)}
        style={({ pressed }) => [
          styles.dropdownTrigger,
          error ? styles.dropdownError : undefined,
          open ? styles.dropdownTriggerOpen : undefined,
          pressed && styles.dropdownTriggerPressed
        ]}
      >
        <Text style={[styles.dropdownValueText, !value && styles.dropdownPlaceholderText]}>
          {value || placeholder}
        </Text>
        <View style={[styles.chevronWrap, open && styles.chevronOpen]}>
          <Text style={styles.dropdownChevron}>▼</Text>
        </View>
      </Pressable>

      {open ? (
        <View style={styles.dropdownMenu}>
          {options.map((option, index) => {
            const selected = option === value;
            const isLast = index === options.length - 1;

            return (
              <Pressable
                key={option}
                onPress={() => handleSelect(option)}
                style={({ pressed }) => [
                  styles.dropdownOption,
                  !isLast && styles.dropdownOptionBorder,
                  selected && styles.dropdownOptionSelected,
                  pressed && styles.dropdownOptionPressed
                ]}
              >
                <Text style={[styles.dropdownOptionText, selected && styles.dropdownOptionTextSelected]}>
                  {option}
                </Text>
                {selected ? <Text style={styles.dropdownCheckmark}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {error ? <Text style={authScreenStyles.error}>{error}</Text> : null}
    </View>
  );
}

export function SignupScreen({ onGoLogin }: SignupScreenProps) {
  const [role, setRole] = useState<AuthRole>("athlete");
  const [step, setStep] = useState<AuthStep>(1);
  const [feedback, setFeedback] = useState<{ tone: BannerTone; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [documentFile, setDocumentFile] = useState<StoredUpload | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);

  const [socialToken, setSocialToken] = useState<{ provider: "google" | "facebook"; idToken: string } | null>(null);

  const googleAndroidId = (runtimeProcessEnv("EXPO_PUBLIC_GOOGLE_ANDROID_ID") ?? "").trim();
  const googleIosId = (runtimeProcessEnv("EXPO_PUBLIC_GOOGLE_IOS_ID") ?? "").trim();

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    androidClientId: googleAndroidId,
    iosClientId: googleIosId
  });

  const [facebookRequest, facebookResponse, promptFacebookAsync] = Facebook.useAuthRequest({
    clientId: (runtimeProcessEnv("EXPO_PUBLIC_FACEBOOK_APP_ID") ?? "").trim()
  });

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken = googleResponse.params?.id_token || googleResponse.authentication?.idToken;
      if (idToken) {
        setSocialToken({ provider: "google", idToken });
        setFeedback({ tone: "info", message: "Google account connected! Please fill in your details and select your role below." });
        setStep(2);
      }
    }
  }, [googleResponse]);

  useEffect(() => {
    if (facebookResponse?.type === "success") {
      const fbToken = facebookResponse.authentication?.accessToken || facebookResponse.params?.access_token;
      if (fbToken) {
        setSocialToken({ provider: "facebook", idToken: fbToken });
        setFeedback({ tone: "info", message: "Facebook account connected! Please fill in your details and select your role below." });
        setStep(2);
      }
    }
  }, [facebookResponse]);

  const athleteForm = useForm<AthleteSignupValues>({
    resolver: zodResolver(athleteSignupSchema),
    defaultValues: DEFAULT_ATHLETE_VALUES
  });

  const coachForm = useForm<CoachSignupValues>({
    resolver: zodResolver(coachSignupSchema),
    defaultValues: DEFAULT_COACH_VALUES
  });

  const activeForm = role === "athlete" ? athleteForm : coachForm;
  const sharedErrors = activeForm.formState.errors as Partial<Record<string, { message?: string }>>;
  const athleteErrors = athleteForm.formState.errors as Partial<Record<string, { message?: string }>>;
  const coachErrors = coachForm.formState.errors as Partial<Record<string, { message?: string }>>;

  useEffect(() => {
    setFeedback(null);
    setStep(1);
    setDocumentFile(null);
    athleteForm.reset(DEFAULT_ATHLETE_VALUES);
    coachForm.reset(DEFAULT_COACH_VALUES);
  }, [athleteForm, coachForm, role]);

  const goNext = async () => {
    const fields = ["first_name", "last_name", "email", "password", "contact_number"] as const;
    const valid = await activeForm.trigger(fields);
    if (valid) {
      setStep(3);
    } else {
      setFeedback({ tone: "error", message: "Please fill in the required details before proceeding." });
    }
  };

  const uploadDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
      multiple: false
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    if (typeof asset.size === "number" && asset.size > MAX_DOCUMENT_BYTES) {
      setFeedback({ tone: "error", message: "Document must be smaller than 25MB." });
      return;
    }

    const nextDocument: StoredUpload = {
      name: asset.name ?? "eligible-document",
      uri: asset.uri,
      mimeType: asset.mimeType ?? "application/octet-stream",
      size: asset.size ?? undefined
    };

    setDocumentFile(nextDocument);
    coachForm.setValue("eligible_documents", nextDocument, { shouldValidate: true });
    setFeedback({ tone: "success", message: `${nextDocument.name} attached.` });
  };

  const submitAthlete = athleteForm.handleSubmit(async (values) => {
    setLoading(true);
    setFeedback(null);

    try {
      if (socialToken) {
        const endpoint = socialToken.provider === "google" ? "/users/google-login" : "/users/facebook-login";
        const { role: _r, ...restValues } = values;
        await requestJson(endpoint, {
          id_token: socialToken.idToken,
          idToken: socialToken.idToken,
          provider: socialToken.provider,
          role: "Athlete",
          ...restValues
        });
      } else {
        await requestJson("/users/register", { ...values, role: "Athlete" });
      }
      setAccountCreated(true);
      athleteForm.reset();
      setSocialToken(null);
    } catch (error) {
      setFeedback({ tone: "error", message: getAuthErrorMessage(error, "Unable to create the account right now.") });
    } finally {
      setLoading(false);
    }
  });

  const submitCoach = coachForm.handleSubmit(async (values) => {
    setLoading(true);
    setFeedback(null);

    try {
      if (socialToken) {
        const endpoint = socialToken.provider === "google" ? "/users/google-login" : "/users/facebook-login";
        const { role: _r, ...restValues } = values;
        await requestJson(endpoint, {
          id_token: socialToken.idToken,
          idToken: socialToken.idToken,
          provider: socialToken.provider,
          role: "Coach",
          ...restValues
        });
      } else {
        const body = new FormData();
        body.append("role", "Coach");
        body.append("first_name", values.first_name);
        body.append("last_name", values.last_name);
        body.append("email", values.email);
        body.append("password", values.password);
        if (values.contact_number) body.append("contact_number", values.contact_number);
        if (values.certification_license_num) body.append("certification_license_num", values.certification_license_num);
        body.append("years_of_experience", String(values.years_of_experience));
        body.append("current_institution", values.current_institution);

        if (documentFile) {
          const docIdentifier = documentFile.name || documentFile.uri || "eligible-document.png";
          body.append("professional_documents", {
            uri: documentFile.uri,
            name: docIdentifier,
            type: documentFile.mimeType ?? "application/octet-stream"
          } as never);
          body.append("professional_documents", docIdentifier);
          body.append("professional_documents", docIdentifier);
        }

        await requestMultipart("/users/coach", body);
      }
      setAccountCreated(true);
      coachForm.reset();
      setDocumentFile(null);
      setSocialToken(null);
    } catch (error) {
      setFeedback({ tone: "error", message: getAuthErrorMessage(error, "Unable to create the account right now.") });
    } finally {
      setLoading(false);
    }
  });

  const submit = role === "athlete" ? submitAthlete : submitCoach;
  const selectedGender = athleteForm.watch("gender");
  const selectedSport = athleteForm.watch("sport_type");

  if (accountCreated) {
    return (
      <View style={styles.createdScreen}>
        <View style={styles.createdPanel}>
          <Text style={styles.createdTitle}>Account Created</Text>
          <Text style={styles.createdMessage}>Your account has been created successfully. You can now log in with your account details.</Text>
          <Button label="Back to Login" onPress={onGoLogin} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {loading ? <FullScreenOverlay label="Creating your account..." /> : null}
      <ScrollView contentContainerStyle={authScreenStyles.content} keyboardShouldPersistTaps="handled">
        <View style={authScreenStyles.shell}>
          <AuthHeader />

          <SectionTitle title="Create your account" subtitle="Pick your role, fill in your details, and continue with personalized access." />
          <Banner tone={feedback?.tone ?? "info"} message={feedback?.message ?? ""} />

          <View style={styles.stepRow}>
            <StepBadge step={1} label="Role" active={step === 1} />
            <StepBadge step={2} label="Account" active={step === 2} />
            <StepBadge step={3} label="Details" active={step === 3} />
          </View>

          {step === 1 ? (
            <View>
              <Text style={styles.sectionLabel}>Select your role</Text>
              <View style={styles.roleRow}>
                <RolePill label="Athlete" selected={role === "athlete"} onPress={() => setRole("athlete")} />
                <RolePill label="Coach" selected={role === "coach"} onPress={() => setRole("coach")} />
              </View>
              <Text style={styles.helper}>The fields below will update automatically for the role you choose.</Text>
              <Button label="Continue" onPress={() => setStep(2)} />

              <View style={authScreenStyles.dividerRow}>
                <View style={authScreenStyles.divider} />
                <Text style={authScreenStyles.or}>or</Text>
                <View style={authScreenStyles.divider} />
              </View>

              <Button
                label="Sign Up with Google"
                variant="secondary"
                icon={require("../../../assets/google.png")}
                onPress={() => {
                  const hasGoogleId = !!(googleAndroidId || googleIosId);
                  if (googleRequest && hasGoogleId) {
                    promptGoogleAsync();
                  } else {
                    setFeedback({ tone: "error", message: "Google sign-in is currently unavailable on this device." });
                  }
                }}
              />
              <View style={authScreenStyles.spacer} />
              <Button
                label="Sign Up with Facebook"
                variant="secondary"
                icon={require("../../../assets/facebook.png")}
                onPress={() => {
                  const hasFacebookId = !!runtimeProcessEnv("EXPO_PUBLIC_FACEBOOK_APP_ID")?.trim();
                  if (facebookRequest && hasFacebookId) {
                    promptFacebookAsync();
                  } else {
                    setFeedback({ tone: "error", message: "Facebook sign-in is currently unavailable on this device." });
                  }
                }}
              />
            </View>
          ) : null}

          {step === 2 ? (
            <View>
              <FormField control={activeForm.control as never} name={"first_name" as never} label="First Name" placeholder="G. Francis" error={sharedErrors.first_name?.message} />
              <FormField control={activeForm.control as never} name={"last_name" as never} label="Last Name" placeholder="Pelonio" error={sharedErrors.last_name?.message} />
              <FormField control={activeForm.control as never} name={"email" as never} label="Email Address" placeholder="coach@gmail.com" autoCapitalize="none" keyboardType="email-address" error={sharedErrors.email?.message} />
              <FormField control={activeForm.control as never} name={"password" as never} label="Password" placeholder="At least 8 chars" secureTextEntry error={sharedErrors.password?.message} />
              <FormField control={activeForm.control as never} name={"contact_number" as never} label="Contact Number" placeholder="09XXXXXXXXX" keyboardType="phone-pad" error={sharedErrors.contact_number?.message} />

              <View style={styles.navRow}>
                <Button label="Back" variant="ghost" onPress={() => setStep(1)} />
                <View style={styles.navSpacer} />
                <Button label="Next" onPress={goNext} />
              </View>
            </View>
          ) : null}

          {step === 3 && role === "athlete" ? (
            <View>
              <FormField control={athleteForm.control} name="birthdate" label="Birthdate" placeholder="YYYY-MM-DD" rightAccessory={<MinimalistCalendarIcon />} error={athleteErrors.birthdate?.message} />
              <ChoiceGroup label="Gender" placeholder="Select Gender" options={genderOptions} value={selectedGender} error={athleteErrors.gender?.message} onChange={(value) => athleteForm.setValue("gender", value as AthleteSignupValues["gender"], { shouldDirty: true, shouldValidate: true })} />
              <FormField control={athleteForm.control} name="province" label="Province" placeholder="Camarines Sur" error={athleteErrors.province?.message} />
              <ChoiceGroup label="Sport Type" placeholder="Select Sport Type" options={sportOptions} value={selectedSport} error={athleteErrors.sport_type?.message} onChange={(value) => athleteForm.setValue("sport_type", value as AthleteSignupValues["sport_type"], { shouldDirty: true, shouldValidate: true })} />

              <Checkbox
                value={athleteForm.watch("terms_accepted")}
                onValueChange={(val) => athleteForm.setValue("terms_accepted", val, { shouldDirty: true, shouldValidate: true })}
                label="I Agree to the Terms of Service and Privacy Protocol for Performance Tracking"
                error={athleteErrors.terms_accepted?.message}
              />

              <View style={styles.navRow}>
                <Button label="Back" variant="ghost" onPress={() => setStep(2)} />
                <View style={styles.navSpacer} />
                <Button label="Sign Up" loading={loading} onPress={submit} />
              </View>
            </View>
          ) : null}

          {step === 3 && role === "coach" ? (
            <View>
              <FormField control={coachForm.control} name="certification_license_num" label="Certification License Number" placeholder="Optional" error={coachErrors.certification_license_num?.message} />
              <FormField control={coachForm.control} name="years_of_experience" label="Years of Experience" placeholder="0 - 60" keyboardType="numeric" error={coachErrors.years_of_experience?.message} />
              <FormField control={coachForm.control} name="current_institution" label="Current Institution" placeholder="School, club, or program" error={coachErrors.current_institution?.message} />

              <View style={styles.documentBox}>
                <Text style={styles.documentLabel}>Eligible Documents</Text>
                <Button label={documentFile ? "Replace File" : "Choose File"} variant="secondary" onPress={uploadDocument} />
                <Text style={styles.documentHint}>{documentFile ? documentFile.name : "Professional license, certification, image, or PDF. Max 25MB."}</Text>
                {coachErrors.eligible_documents?.message ? <Text style={authScreenStyles.error}>{coachErrors.eligible_documents.message}</Text> : null}
              </View>

              <Checkbox
                value={coachForm.watch("terms_accepted")}
                onValueChange={(val) => coachForm.setValue("terms_accepted", val, { shouldDirty: true, shouldValidate: true })}
                label="I Agree to the Terms of Service and Privacy Protocol for Performance Tracking"
                error={coachErrors.terms_accepted?.message}
              />

              <View style={styles.navRow}>
                <Button label="Back" variant="ghost" onPress={() => setStep(2)} />
                <View style={styles.navSpacer} />
                <Button label="Sign Up" loading={loading} onPress={submit} />
              </View>
            </View>
          ) : null}

          <Text style={authScreenStyles.footer}>
            Already have an account? <Text style={authScreenStyles.footerLink} onPress={onGoLogin}>Log In</Text>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function runtimeProcessEnv(key: string): string | undefined {
  const runtime = globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } };
  return runtime.process?.env?.[key];
}


