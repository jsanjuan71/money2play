"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  IconButton,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Radio,
  RadioGroup,
  FormControlLabel,
} from "@mui/material";
import {
  ArrowBack,
  School,
  PlayCircle,
  Article,
  Quiz,
  AutoStories,
  CheckCircle,
  AccessTime,
  EmojiEvents,
} from "@mui/icons-material";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Header } from "@/components/Header";
import { Id } from "../../../../convex/_generated/dataModel";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const CONTENT_TYPES = [
  { value: "video", label: "Videos", icon: <PlayCircle /> },
  { value: "article", label: "Articles", icon: <Article /> },
  { value: "quiz", label: "Quizzes", icon: <Quiz /> },
  { value: "story", label: "Stories", icon: <AutoStories /> },
];

const CATEGORIES = [
  { value: "budgeting", label: "Budgeting", icon: "📊" },
  { value: "saving", label: "Saving", icon: "🐷" },
  { value: "investing", label: "Investing", icon: "📈" },
  { value: "earning", label: "Earning", icon: "💰" },
  { value: "spending_wisely", label: "Smart Spending", icon: "🛒" },
  { value: "needs_vs_wants", label: "Needs vs Wants", icon: "🤔" },
];

export default function KidLearnPage() {
  const t = useTranslations();
  const router = useRouter();
  const { isAuthenticated, userType, token, isLoading: authLoading } = useAuth();

  // State
  const [tabValue, setTabValue] = useState(0);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Fetch data
  const currentType = CONTENT_TYPES[tabValue]?.value;
  const content = useQuery(
    api.learning.getContentWithProgress,
    token
      ? {
          token,
          filterType: currentType,
          filterCategory: filterCategory || undefined,
        }
      : "skip"
  );
  const stats = useQuery(
    api.learning.getLearningStats,
    token ? { token } : "skip"
  );

  // Mutations
  const startContentMutation = useMutation(api.learning.startContent);
  const completeContentMutation = useMutation(api.learning.completeContent);

  // Redirect if not authenticated as kid
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || userType !== "kid")) {
      router.push("/auth?type=kid");
    }
  }, [isAuthenticated, userType, authLoading, router]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <PlayCircle />;
      case "article":
        return <Article />;
      case "quiz":
        return <Quiz />;
      case "story":
        return <AutoStories />;
      default:
        return <School />;
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat?.icon || "📚";
  };

  const getCategoryLabel = (category: string) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat?.label || category;
  };

  const handleOpenContent = async (contentItem: any) => {
    setSelectedContent(contentItem);
    setContentDialogOpen(true);

    // Start tracking progress
    if (token && !contentItem.isCompleted) {
      try {
        await startContentMutation({ token, contentId: contentItem._id });
      } catch (err) {
        // Ignore if already started
      }
    }

    // Parse quiz questions if it's a quiz
    if (contentItem.type === "quiz" && contentItem.content) {
      try {
        const parsed = JSON.parse(contentItem.content);
        setQuizQuestions(parsed.questions || []);
        setCurrentQuestionIndex(0);
        setSelectedAnswers([]);
        setQuizCompleted(false);
        setQuizScore(0);
      } catch (e) {
        console.error("Failed to parse quiz", e);
      }
    }
  };

  const handleCompleteContent = async (quizScoreValue?: number) => {
    if (!token || !selectedContent) return;
    setError(null);
    setLoading(true);

    try {
      const result = await completeContentMutation({
        token,
        contentId: selectedContent._id,
        quizScore: quizScoreValue,
      });

      if (result.alreadyCompleted) {
        setSuccess("You've already completed this!");
      } else {
        setSuccess(`Completed! Earned ${result.coinReward} coins and ${result.xpReward} XP!`);
      }
      setContentDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete");
    } finally {
      setLoading(false);
    }
  };

  const handleQuizAnswer = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    // Calculate score
    let correct = 0;
    quizQuestions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correctAnswer) {
        correct++;
      }
    });
    const scorePercent = Math.round((correct / quizQuestions.length) * 100);
    setQuizScore(scorePercent);
    setQuizCompleted(true);

    // Try to complete
    await handleCompleteContent(scorePercent);
  };

  const renderContentCard = (item: any) => {
    return (
      <Card
        key={item._id}
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          border: item.isCompleted ? "2px solid #4CAF50" : "1px solid",
          borderColor: item.isCompleted ? "#4CAF50" : "divider",
          position: "relative",
        }}
      >
        {item.isCompleted && (
          <Box
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              bgcolor: "success.main",
              borderRadius: "50%",
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <CheckCircle sx={{ fontSize: 20, color: "white" }} />
          </Box>
        )}

        <Box
          sx={{
            height: 100,
            background: `linear-gradient(135deg, ${
              item.type === "video"
                ? "#E91E63"
                : item.type === "article"
                ? "#2196F3"
                : item.type === "quiz"
                ? "#FF9800"
                : "#9C27B0"
            }22 0%, ${
              item.type === "video"
                ? "#E91E63"
                : item.type === "article"
                ? "#2196F3"
                : item.type === "quiz"
                ? "#FF9800"
                : "#9C27B0"
            }44 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color:
              item.type === "video"
                ? "#E91E63"
                : item.type === "article"
                ? "#2196F3"
                : item.type === "quiz"
                ? "#FF9800"
                : "#9C27B0",
          }}
        >
          {React.cloneElement(getTypeIcon(item.type), { sx: { fontSize: 48 } })}
        </Box>

        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
            <Chip
              size="small"
              icon={<span>{getCategoryIcon(item.category)}</span>}
              label={getCategoryLabel(item.category)}
            />
            {item.durationMinutes && (
              <Chip
                size="small"
                icon={<AccessTime sx={{ fontSize: 14 }} />}
                label={`${item.durationMinutes} min`}
              />
            )}
          </Box>

          <Typography variant="subtitle1" fontWeight="600" gutterBottom>
            {item.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {item.description}
          </Typography>

          <Box sx={{ display: "flex", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography variant="body2">🪙</Typography>
              <Typography variant="body2" fontWeight="600">
                {item.coinReward}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography variant="body2">⭐</Typography>
              <Typography variant="body2" fontWeight="600">
                {item.xpReward} XP
              </Typography>
            </Box>
          </Box>
        </CardContent>

        <CardActions>
          <Button
            fullWidth
            variant={item.isCompleted ? "outlined" : "contained"}
            onClick={() => handleOpenContent(item)}
          >
            {item.isCompleted ? "Review" : item.type === "quiz" ? "Take Quiz" : "Start"}
          </Button>
        </CardActions>
      </Card>
    );
  };

  if (authLoading || !isAuthenticated || userType !== "kid") {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="min-h-screen" sx={{ bgcolor: "background.default" }}>
      <Header />

      {/* Hero Section */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #3F51B5 0%, #7986CB 100%)",
          py: 4,
          color: "white",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <IconButton onClick={() => router.push("/kid")} sx={{ color: "white" }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" fontWeight="700">
              Learn & Earn
            </Typography>
            <School />
          </Box>

          <Grid container spacing={3}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper
                sx={{
                  p: 2,
                  background: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  textAlign: "center",
                }}
              >
                <Typography variant="h4" fontWeight="700">
                  {stats?.completedCount || 0}
                </Typography>
                <Typography variant="caption">Completed</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper
                sx={{
                  p: 2,
                  background: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  textAlign: "center",
                }}
              >
                <Typography variant="h4" fontWeight="700">
                  {stats?.totalCount || 0}
                </Typography>
                <Typography variant="caption">Total</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper
                sx={{
                  p: 2,
                  background: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  textAlign: "center",
                }}
              >
                <Typography variant="h4" fontWeight="700">
                  {stats?.totalCoinsEarned || 0}
                </Typography>
                <Typography variant="caption">Coins Earned</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper
                sx={{
                  p: 2,
                  background: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  textAlign: "center",
                }}
              >
                <Typography variant="h4" fontWeight="700">
                  {stats?.totalXpEarned || 0}
                </Typography>
                <Typography variant="caption">XP Earned</Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Progress */}
          {stats && stats.totalCount > 0 && (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body2">Learning Progress</Typography>
                <Typography variant="body2">
                  {stats.completedCount}/{stats.totalCount} completed
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(stats.completedCount / stats.totalCount) * 100}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  bgcolor: "rgba(255,255,255,0.3)",
                  "& .MuiLinearProgress-bar": {
                    bgcolor: "white",
                  },
                }}
              />
            </Box>
          )}
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Type Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            variant="fullWidth"
          >
            {CONTENT_TYPES.map((type) => (
              <Tab
                key={type.value}
                icon={type.icon}
                label={type.label}
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Paper>

        {/* Category Filter */}
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={filterCategory}
              label="Category"
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <MenuItem value="">All Categories</MenuItem>
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Content Grid */}
        {!content || content.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: "center" }}>
            <School sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No content available in this category
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try a different category or check back later!
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {content.map((item) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item._id}>
                {renderContentCard(item)}
              </Grid>
            ))}
          </Grid>
        )}

        {/* Learning Tips */}
        <Paper
          sx={{
            p: 3,
            mt: 4,
            background: "linear-gradient(135deg, #E8EAF6 0%, #C5CAE9 100%)",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Box sx={{ fontSize: 50 }}>📚</Box>
          <Box>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              Learning Tips
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Watch videos to understand concepts, read articles for details, take quizzes to test your knowledge,
              and enjoy stories that teach you about money! Each completed item earns you coins and XP!
            </Typography>
          </Box>
        </Paper>
      </Container>

      {/* Content Dialog */}
      <Dialog
        open={contentDialogOpen}
        onClose={() => setContentDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedContent && (
          <>
            <DialogTitle>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                {getTypeIcon(selectedContent.type)}
                <Box>
                  <Typography variant="h6">{selectedContent.title}</Typography>
                  <Chip
                    size="small"
                    icon={<span>{getCategoryIcon(selectedContent.category)}</span>}
                    label={getCategoryLabel(selectedContent.category)}
                  />
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              {/* Video content */}
              {selectedContent.type === "video" && (
                <Box>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedContent.description}
                  </Typography>
                  <Paper
                    sx={{
                      p: 4,
                      textAlign: "center",
                      bgcolor: "grey.100",
                      mb: 2,
                    }}
                  >
                    <PlayCircle sx={{ fontSize: 80, color: "grey.400", mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      Video player would go here
                    </Typography>
                    <Typography variant="caption" display="block">
                      Duration: {selectedContent.durationMinutes} minutes
                    </Typography>
                  </Paper>
                  <Alert severity="info">
                    Watch the complete video to earn your reward!
                  </Alert>
                </Box>
              )}

              {/* Article/Story content */}
              {(selectedContent.type === "article" || selectedContent.type === "story") && (
                <Box>
                  <Paper
                    sx={{
                      p: 3,
                      maxHeight: 400,
                      overflow: "auto",
                      bgcolor: "grey.50",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    <Typography variant="body1" component="div">
                      {selectedContent.content || selectedContent.description}
                    </Typography>
                  </Paper>
                </Box>
              )}

              {/* Quiz content */}
              {selectedContent.type === "quiz" && quizQuestions.length > 0 && (
                <Box>
                  {!quizCompleted ? (
                    <>
                      {/* Progress */}
                      <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                          <Typography variant="body2">
                            Question {currentQuestionIndex + 1} of {quizQuestions.length}
                          </Typography>
                          <Typography variant="body2">
                            {selectedAnswers.filter((a) => a !== undefined).length} answered
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={((currentQuestionIndex + 1) / quizQuestions.length) * 100}
                        />
                      </Box>

                      {/* Question */}
                      <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                          {quizQuestions[currentQuestionIndex]?.question}
                        </Typography>
                        <RadioGroup
                          value={selectedAnswers[currentQuestionIndex] ?? -1}
                          onChange={(e) => handleQuizAnswer(parseInt(e.target.value))}
                        >
                          {quizQuestions[currentQuestionIndex]?.options.map(
                            (option: string, index: number) => (
                              <FormControlLabel
                                key={index}
                                value={index}
                                control={<Radio />}
                                label={option}
                                sx={{
                                  mb: 1,
                                  p: 1,
                                  borderRadius: 1,
                                  "&:hover": { bgcolor: "action.hover" },
                                }}
                              />
                            )
                          )}
                        </RadioGroup>
                      </Paper>

                      {/* Navigation */}
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Button
                          onClick={handlePrevQuestion}
                          disabled={currentQuestionIndex === 0}
                        >
                          Previous
                        </Button>
                        {currentQuestionIndex < quizQuestions.length - 1 ? (
                          <Button
                            variant="contained"
                            onClick={handleNextQuestion}
                            disabled={selectedAnswers[currentQuestionIndex] === undefined}
                          >
                            Next
                          </Button>
                        ) : (
                          <Button
                            variant="contained"
                            color="success"
                            onClick={handleSubmitQuiz}
                            disabled={
                              selectedAnswers.filter((a) => a !== undefined).length !==
                              quizQuestions.length
                            }
                          >
                            Submit Quiz
                          </Button>
                        )}
                      </Box>
                    </>
                  ) : (
                    /* Quiz Results */
                    <Box sx={{ textAlign: "center", py: 4 }}>
                      <EmojiEvents
                        sx={{
                          fontSize: 80,
                          color: quizScore >= 60 ? "success.main" : "warning.main",
                          mb: 2,
                        }}
                      />
                      <Typography variant="h4" fontWeight="700" gutterBottom>
                        {quizScore}%
                      </Typography>
                      <Typography variant="h6" gutterBottom>
                        {quizScore >= 80
                          ? "Excellent!"
                          : quizScore >= 60
                          ? "Good job!"
                          : "Keep learning!"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        You got {Math.round((quizScore / 100) * quizQuestions.length)} out of{" "}
                        {quizQuestions.length} questions correct.
                      </Typography>
                      {quizScore < 60 && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                          You need at least 60% to pass. Review the content and try again!
                        </Alert>
                      )}
                    </Box>
                  )}
                </Box>
              )}

              {/* Rewards info */}
              {!selectedContent.isCompleted && (
                <Paper sx={{ p: 2, mt: 2, bgcolor: "action.hover" }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Complete to earn:
                  </Typography>
                  <Box sx={{ display: "flex", gap: 4 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="h6">🪙</Typography>
                      <Typography variant="body1" fontWeight="600">
                        {selectedContent.coinReward} coins
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="h6">⭐</Typography>
                      <Typography variant="body1" fontWeight="600">
                        {selectedContent.xpReward} XP
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setContentDialogOpen(false)}>Close</Button>
              {selectedContent.type !== "quiz" && !selectedContent.isCompleted && (
                <Button
                  variant="contained"
                  onClick={() => handleCompleteContent()}
                  disabled={loading}
                  startIcon={<CheckCircle />}
                >
                  {loading ? <CircularProgress size={24} /> : "Mark as Complete"}
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
